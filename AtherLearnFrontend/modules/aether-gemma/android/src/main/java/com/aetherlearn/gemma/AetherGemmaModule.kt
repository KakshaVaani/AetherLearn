package com.aetherlearn.gemma

import android.app.ActivityManager
import android.content.Context
import android.os.Build
import android.os.StatFs
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.withContext
import com.google.ai.edge.litertlm.Backend
import com.google.ai.edge.litertlm.Contents
import com.google.ai.edge.litertlm.ConversationConfig
import com.google.ai.edge.litertlm.Engine
import com.google.ai.edge.litertlm.EngineConfig
import com.google.ai.edge.litertlm.SamplerConfig

class AetherGemmaModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AetherGemma")

    AsyncFunction("getDeviceCapabilities") {
      val context = appContext.reactContext ?: throw IllegalStateException("React context unavailable")
      val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
      val memoryInfo = ActivityManager.MemoryInfo()
      activityManager.getMemoryInfo(memoryInfo)
      val modelDir = modelDirectory(context)
      val stat = StatFs(modelDir.absolutePath)
      mapOf(
        "platform" to "android",
        "androidSdk" to Build.VERSION.SDK_INT,
        "totalMemoryBytes" to memoryInfo.totalMem,
        "availableMemoryBytes" to memoryInfo.availMem,
        "freeStorageBytes" to stat.availableBytes,
        "modelDirectory" to modelDir.absolutePath,
        "seedDirectory" to seedDirectory(context).absolutePath,
        "nativeBridgeAvailable" to true
      )
    }

    AsyncFunction("getModelStatus") { modelId: String ->
      val context = appContext.reactContext ?: throw IllegalStateException("React context unavailable")
      installedModelStatus(context, modelId)
    }

    AsyncFunction("getSeededModelStatus") { modelId: String, modelFile: String ->
      val context = appContext.reactContext ?: throw IllegalStateException("React context unavailable")
      val file = seedFile(context, modelFile)
      mapOf(
        "modelId" to modelId,
        "available" to (file.exists() && file.length() > 0L),
        "path" to file.absolutePath,
        "bytes" to if (file.exists()) file.length() else 0L,
        "expectedPath" to file.absolutePath
      )
    }

    AsyncFunction("deleteModel") { modelId: String ->
      val context = appContext.reactContext ?: throw IllegalStateException("React context unavailable")
      val file = modelFile(context, modelId)
      val deleted = if (file.exists()) file.delete() else false
      mapOf("modelId" to modelId, "deleted" to deleted)
    }

    AsyncFunction("downloadModel") Coroutine { modelId: String, modelFile: String, commitHash: String ->
      val context = appContext.reactContext ?: throw IllegalStateException("React context unavailable")
      withContext(Dispatchers.IO) {
        val destination = modelFile(context, modelId)
        destination.parentFile?.mkdirs()
        val partial = File(destination.absolutePath + ".partial")
        val url = URL("https://huggingface.co/$modelId/resolve/$commitHash/$modelFile")
        val connection = url.openConnection() as HttpURLConnection
        connection.connectTimeout = 30000
        connection.readTimeout = 30000
        connection.instanceFollowRedirects = true
        connection.connect()
        if (connection.responseCode !in 200..299) {
          throw IllegalStateException("Model download failed with HTTP ${connection.responseCode}")
        }
        connection.inputStream.use { input ->
          partial.outputStream().use { output ->
            input.copyTo(output)
          }
        }
        if (destination.exists()) destination.delete()
        if (!partial.renameTo(destination)) {
          throw IllegalStateException("Could not move downloaded model into place")
        }
        mapOf(
          "modelId" to modelId,
          "downloaded" to true,
          "path" to destination.absolutePath,
          "bytes" to destination.length()
        )
      }
    }

    AsyncFunction("importSeededModel") Coroutine { modelId: String, modelFile: String ->
      val context = appContext.reactContext ?: throw IllegalStateException("React context unavailable")
      withContext(Dispatchers.IO) {
        val destination = modelFile(context, modelId)
        if (destination.exists() && destination.length() > 0L) {
          return@withContext installedModelStatus(context, modelId)
        }

        val source = seedFile(context, modelFile)
        if (!source.exists()) {
          throw IllegalStateException("Seeded model file not found at ${source.absolutePath}")
        }
        if (source.length() <= 0L) {
          throw IllegalStateException("Seeded model file is empty: ${source.absolutePath}")
        }

        destination.parentFile?.mkdirs()
        val partial = File(destination.absolutePath + ".seed")
        if (partial.exists()) partial.delete()
        source.inputStream().use { input ->
          partial.outputStream().use { output ->
            input.copyTo(output)
          }
        }
        if (partial.length() <= 0L) {
          partial.delete()
          throw IllegalStateException("Seeded model import failed: copied file is empty")
        }
        if (destination.exists()) destination.delete()
        if (!partial.renameTo(destination)) {
          partial.delete()
          throw IllegalStateException("Could not move seeded model into place")
        }
        installedModelStatus(context, modelId)
      }
    }

    AsyncFunction("generate") Coroutine { request: Map<String, Any?> ->
      val context = appContext.reactContext ?: throw IllegalStateException("React context unavailable")
      withContext(Dispatchers.Default) {
        val modelId = request["modelId"] as? String ?: throw IllegalArgumentException("modelId is required")
        val prompt = request["prompt"] as? String ?: throw IllegalArgumentException("prompt is required")
        val systemInstruction = request["systemInstruction"] as? String ?: "You are a helpful classroom assistant."
        val file = modelFile(context, modelId)
        if (!file.exists()) throw IllegalStateException("Model is not downloaded")

        val startedAt = System.currentTimeMillis()
        val engineConfig = EngineConfig(
          modelPath = file.absolutePath,
          backend = Backend.CPU(),
          cacheDir = context.cacheDir.absolutePath
        )
        Engine(engineConfig).use { engine ->
          engine.initialize()
          val conversationConfig = ConversationConfig(
            systemInstruction = Contents.of(systemInstruction),
            samplerConfig = SamplerConfig(topK = 64, topP = 0.95, temperature = 1.0)
          )
          engine.createConversation(conversationConfig).use { conversation ->
            val chunks = StringBuilder()
            conversation.sendMessageAsync(prompt)
              .catch { throwable -> throw throwable }
              .collect { message -> chunks.append(message.toString()) }
            mapOf(
              "text" to chunks.toString(),
              "latencyMs" to (System.currentTimeMillis() - startedAt),
              "modelPath" to file.absolutePath
            )
          }
        }
      }
    }
  }

  private fun modelDirectory(context: Context): File {
    return File(context.filesDir, "aether-gemma-models").apply { mkdirs() }
  }

  private fun seedDirectory(context: Context): File {
    val baseDir = context.getExternalFilesDir(null) ?: context.filesDir
    return File(baseDir, "aether-gemma-seeds").apply { mkdirs() }
  }

  private fun modelFile(context: Context, modelId: String): File {
    val fileName = modelId.substringAfterLast("/").replace(Regex("[^A-Za-z0-9._-]"), "_") + ".litertlm"
    return File(modelDirectory(context), fileName)
  }

  private fun seedFile(context: Context, modelFile: String): File {
    return File(seedDirectory(context), modelFile)
  }

  private fun installedModelStatus(context: Context, modelId: String): Map<String, Any> {
    val file = modelFile(context, modelId)
    return mapOf(
      "modelId" to modelId,
      "downloaded" to (file.exists() && file.length() > 0L),
      "path" to file.absolutePath,
      "bytes" to if (file.exists()) file.length() else 0L
    )
  }
}
