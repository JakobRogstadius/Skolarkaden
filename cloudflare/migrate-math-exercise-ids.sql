-- Run in D1 > skolarkaden > Console after deploying the updated worker.mjs.
-- Requires settings_json (see add-score-settings.sql for older installations).
-- One atomic UPDATE; safe to run again. No rows are deleted or merged.
-- Scores, names, submission IDs, timestamps, IPs, game versions and difficulties
-- are preserved. Only the exercise component and settings.exercise are renamed.
WITH math_ids(old_id, new_id) AS (VALUES
  ('math',  'math-addition'),
  ('math2', 'math-addition-subtraction'),
  ('math3', 'math-large-numbers'),
  ('math4', 'math-multiplication'),
  ('math5', 'math-multiplication-division'),
  ('math6', 'math-equations')
)
UPDATE highscores
SET leaderboard_key = COALESCE(
      (SELECT replace(leaderboard_key, ':' || old_id || ':', ':' || new_id || ':')
       FROM math_ids WHERE instr(leaderboard_key, ':' || old_id || ':') > 0),
      leaderboard_key),
    settings_json = CASE
      WHEN json_valid(settings_json) THEN CASE
        WHEN json_type(settings_json) = 'object'
          AND json_extract(settings_json, '$.exercise') IN (SELECT old_id FROM math_ids)
        THEN json_set(settings_json, '$.exercise',
          (SELECT new_id FROM math_ids WHERE old_id = json_extract(settings_json, '$.exercise')))
        ELSE settings_json END
      ELSE settings_json END
WHERE EXISTS (SELECT 1 FROM math_ids WHERE instr(leaderboard_key, ':' || old_id || ':') > 0)
   OR CASE WHEN json_valid(settings_json) THEN
        json_type(settings_json) = 'object'
        AND json_extract(settings_json, '$.exercise') IN (SELECT old_id FROM math_ids)
      ELSE 0 END;
