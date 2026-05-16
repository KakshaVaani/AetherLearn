import { Platform } from "react-native";
import * as Speech from "expo-speech";

export type TtsStatus = "ready" | "loading_voices" | "playing" | "stopped" | "finished" | "error";

type SpeakOptions = {
  language: string;
  rate?: number;
  pitch?: number;
  onStatus: (status: TtsStatus) => void;
  onError: (message: string) => void;
};

let webUtterance: SpeechSynthesisUtterance | null = null;
let webStoppedByUser = false;
let webSpeechRunId = 0;
const WEB_CHUNK_LIMIT = 220;
const BAD_VOICE_TERMS = [
  "bad",
  "bells",
  "boing",
  "bubbles",
  "cellos",
  "deranged",
  "hysterical",
  "junior",
  "novelty",
  "organ",
  "superstar",
  "trinoids",
  "whisper",
  "zarvox"
];

export async function speakWithDeviceTts(text: string, options: SpeakOptions) {
  const transcript = speechReadyText(text);
  if (!transcript) {
    options.onStatus("error");
    options.onError("No audio text is available for this pack.");
    return;
  }

  if (Platform.OS === "web") {
    await speakWithWebTts(transcript, options);
    return;
  }

  Speech.stop();
  options.onStatus("playing");
  Speech.speak(transcript, {
    language: options.language,
    rate: Math.min(options.rate ?? 0.82, 0.88),
    pitch: options.pitch ?? 1,
    onStart: () => options.onStatus("playing"),
    onDone: () => options.onStatus("finished"),
    onStopped: () => options.onStatus("stopped"),
    onError: () => {
      options.onStatus("error");
      options.onError("Audio could not play on this device.");
    }
  });
}

export function stopDeviceTts() {
  if (Platform.OS === "web") {
    const synth = getSpeechSynthesis();
    webSpeechRunId += 1;
    webStoppedByUser = true;
    webUtterance = null;
    synth?.cancel();
    return;
  }
  Speech.stop();
}

async function speakWithWebTts(text: string, options: SpeakOptions) {
  const synth = getSpeechSynthesis();
  const Utterance = getSpeechSynthesisUtterance();
  if (!synth || !Utterance) {
    options.onStatus("error");
    options.onError("Browser text-to-speech is not available.");
    return;
  }

  const runId = webSpeechRunId + 1;
  webSpeechRunId = runId;
  webStoppedByUser = false;
  synth.cancel();
  options.onStatus("loading_voices");
  const voices = await getWebVoices(synth);
  if (runId !== webSpeechRunId) return;
  const chunks = chunkSpeechText(text);
  const voice = pickVoice(voices, options.language);
  speakWebChunk({ chunks, index: 0, runId, synth, Utterance, voice, options });
}

function getSpeechSynthesis() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  return window.speechSynthesis;
}

function getSpeechSynthesisUtterance() {
  if (typeof window === "undefined" || !("SpeechSynthesisUtterance" in window)) return null;
  return window.SpeechSynthesisUtterance;
}

function getWebVoices(synth: SpeechSynthesis) {
  const voices = synth.getVoices();
  if (voices.length) return Promise.resolve(voices);

  return new Promise<SpeechSynthesisVoice[]>((resolve) => {
    const timeout = setTimeout(() => resolve(synth.getVoices()), 600);
    synth.onvoiceschanged = () => {
      clearTimeout(timeout);
      resolve(synth.getVoices());
    };
  });
}

function pickVoice(voices: SpeechSynthesisVoice[], language: string) {
  const languagePrefix = language.split("-")[0].toLowerCase();
  const usableVoices = voices.filter((voice) => !BAD_VOICE_TERMS.some((term) => voice.name.toLowerCase().includes(term)));
  const candidates = usableVoices.length ? usableVoices : voices;
  return candidates
    .map((voice) => ({ voice, score: voiceScore(voice, language, languagePrefix) }))
    .sort((a, b) => b.score - a.score)[0]?.voice;
}

function voiceScore(voice: SpeechSynthesisVoice, language: string, languagePrefix: string) {
  const voiceLanguage = voice.lang.toLowerCase();
  const voiceName = voice.name.toLowerCase();
  let score = 0;
  if (voiceLanguage === language.toLowerCase()) score += 50;
  if (voiceLanguage.startsWith(languagePrefix)) score += 30;
  if (voice.default) score += 10;
  if (voice.localService) score += 8;
  if (voiceName.includes("google")) score += 8;
  if (voiceName.includes("microsoft")) score += 6;
  if (voiceName.includes("samantha") || voiceName.includes("alex")) score += 6;
  if (BAD_VOICE_TERMS.some((term) => voiceName.includes(term))) score -= 100;
  return score;
}

type WebChunkOptions = {
  chunks: string[];
  index: number;
  runId: number;
  synth: SpeechSynthesis;
  Utterance: typeof SpeechSynthesisUtterance;
  voice?: SpeechSynthesisVoice;
  options: SpeakOptions;
};

function speakWebChunk({ chunks, index, runId, synth, Utterance, voice, options }: WebChunkOptions) {
  if (runId !== webSpeechRunId) return;
  const text = chunks[index];
  if (!text) {
    webUtterance = null;
    options.onStatus(webStoppedByUser ? "stopped" : "finished");
    return;
  }

  const utterance = new Utterance(text);
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang ?? options.language;
  utterance.rate = Math.min(options.rate ?? 0.82, 0.88);
  utterance.pitch = 1;
  utterance.volume = 1;
  webUtterance = utterance;

  utterance.onstart = () => options.onStatus("playing");
  utterance.onend = () => {
    if (runId !== webSpeechRunId) return;
    if (webStoppedByUser) {
      webUtterance = null;
      options.onStatus("stopped");
      return;
    }
    speakWebChunk({ chunks, index: index + 1, runId, synth, Utterance, voice, options });
  };
  utterance.onerror = () => {
    if (runId !== webSpeechRunId) return;
    webUtterance = null;
    options.onStatus("error");
    options.onError("Browser text-to-speech could not play clearly.");
  };

  synth.speak(utterance);
  setTimeout(() => {
    if (runId === webSpeechRunId && webUtterance === utterance && synth.speaking) {
      options.onStatus("playing");
    }
  }, 250);
}

function speechReadyText(text: string) {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\\text\{([^}]*)\}/g, "$1")
    .replace(/CO_?\{?2\}?/gi, "C O 2")
    .replace(/O_?\{?2\}?/gi, "O 2")
    .replace(/H_?\{?2\}?O/gi, "H 2 O")
    .replace(/\\to|->|→/g, " to ")
    .replace(/\+/g, " plus ")
    .replace(/=/g, " equals ")
    .replace(/&/g, " and ")
    .replace(/#{1,6}\s*/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/[_*$]/g, "")
    .replace(/[{}[\]<>]/g, " ")
    .replace(/^\s*[-•]\s*/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function chunkSpeechText(text: string) {
  const cleaned = speechReadyText(text);
  if (!cleaned) return [];
  const sentences = cleaned.match(/[^.!?]+[.!?]*/g)?.map((sentence) => sentence.trim()).filter(Boolean) ?? [cleaned];
  const chunks: string[] = [];
  let current = "";

  sentences.forEach((sentence) => {
    if (!current) {
      current = sentence;
      return;
    }
    if (`${current} ${sentence}`.length <= WEB_CHUNK_LIMIT) {
      current = `${current} ${sentence}`;
      return;
    }
    chunks.push(current);
    current = sentence;
  });

  if (current) chunks.push(current);
  return chunks.flatMap(splitLongChunk);
}

function splitLongChunk(chunk: string) {
  if (chunk.length <= WEB_CHUNK_LIMIT) return [chunk];
  const words = chunk.split(" ");
  const chunks: string[] = [];
  let current = "";
  words.forEach((word) => {
    if (!current) {
      current = word;
      return;
    }
    if (`${current} ${word}`.length <= WEB_CHUNK_LIMIT) {
      current = `${current} ${word}`;
      return;
    }
    chunks.push(current);
    current = word;
  });
  if (current) chunks.push(current);
  return chunks;
}
