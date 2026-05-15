# Events

Events use a shared envelope:

```json
{
  "eventId": "uuid",
  "eventType": "LessonGenerationRequested",
  "version": 1,
  "timestamp": "ISO",
  "producer": "lesson-service",
  "correlationId": "uuid",
  "causationId": "uuid",
  "actor": { "userId": "string", "role": "teacher" },
  "payload": {}
}
```

Core subjects include `lesson.generation.requested`,
`lesson.generation.completed`, `student.progress.updated`,
`commons.review.approved`, `kvpack.created`, and `notification.created`.
