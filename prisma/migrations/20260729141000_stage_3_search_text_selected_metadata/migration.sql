-- Stage 3 corrective migration:
-- Rebuild denormalized chunk search text from selected non-sensitive metadata keys.
-- This preserves migration history after the initial Stage 3 migration and avoids
-- relying on full metadata JSON text for search.

UPDATE "ResourceChunk" AS c
SET "searchText" = array_to_string(
  ARRAY_REMOVE(ARRAY[
    r."title",
    r."description",
    r."sourceKind"::text,
    CASE WHEN r."subjectId" IS NOT NULL THEN 'Subject ' || r."subjectId" ELSE NULL END,
    CASE WHEN r."topicId" IS NOT NULL THEN 'Topic ' || r."topicId" ELSE NULL END,
    c."title",
    c."chunkType"::text,
    CASE WHEN c."questionNumber" IS NOT NULL THEN 'Question ' || c."questionNumber" ELSE NULL END,
    CASE WHEN c."pageStart" IS NOT NULL THEN 'Page ' || c."pageStart" ELSE NULL END,
    CASE WHEN c."pageEnd" IS NOT NULL AND c."pageEnd" <> c."pageStart" THEN 'Page ' || c."pageEnd" ELSE NULL END,
    CASE WHEN jsonb_extract_path_text(c."metadata", 'year') IS NOT NULL THEN 'year: ' || jsonb_extract_path_text(c."metadata", 'year') ELSE NULL END,
    CASE WHEN jsonb_extract_path_text(c."metadata", 'paperYear') IS NOT NULL THEN 'paperYear: ' || jsonb_extract_path_text(c."metadata", 'paperYear') ELSE NULL END,
    CASE WHEN jsonb_extract_path_text(c."metadata", 'paper') IS NOT NULL THEN 'paper: ' || jsonb_extract_path_text(c."metadata", 'paper') ELSE NULL END,
    CASE WHEN jsonb_extract_path_text(c."metadata", 'paperCode') IS NOT NULL THEN 'paperCode: ' || jsonb_extract_path_text(c."metadata", 'paperCode') ELSE NULL END,
    CASE WHEN jsonb_extract_path_text(c."metadata", 'paperIdentifier') IS NOT NULL THEN 'paperIdentifier: ' || jsonb_extract_path_text(c."metadata", 'paperIdentifier') ELSE NULL END,
    CASE WHEN jsonb_extract_path_text(c."metadata", 'questionNumber') IS NOT NULL THEN 'questionNumber: ' || jsonb_extract_path_text(c."metadata", 'questionNumber') ELSE NULL END,
    CASE WHEN jsonb_extract_path_text(c."metadata", 'section') IS NOT NULL THEN 'section: ' || jsonb_extract_path_text(c."metadata", 'section') ELSE NULL END,
    CASE WHEN jsonb_extract_path_text(c."metadata", 'heading') IS NOT NULL THEN 'heading: ' || jsonb_extract_path_text(c."metadata", 'heading') ELSE NULL END,
    CASE WHEN jsonb_extract_path_text(c."metadata", 'structure') IS NOT NULL THEN 'structure: ' || jsonb_extract_path_text(c."metadata", 'structure') ELSE NULL END,
    c."content"
  ], NULL),
  E'\n'
)
FROM "Resource" AS r
WHERE c."resourceId" = r."id";
