-- TicketFlow seed data
-- Run after applying migrations to populate catalog tables

-- Artist types
INSERT INTO artist_types (name, slug) VALUES
  ('Banda',          'banda'),
  ('DJ',             'dj'),
  ('Solista',        'solista'),
  ('Dúo',            'duo'),
  ('Orquesta',       'orquesta'),
  ('Comediante',     'comediante'),
  ('Conferencista',  'conferencista'),
  ('Otro',           'otro')
ON CONFLICT (slug) DO NOTHING;

-- Event types
INSERT INTO event_types (name, slug) VALUES
  ('Concierto',    'concierto'),
  ('Festival',     'festival'),
  ('Teatro',       'teatro'),
  ('Stand-up',     'standup'),
  ('Conferencia',  'conferencia'),
  ('Exposición',   'exposicion'),
  ('Deportivo',    'deportivo'),
  ('Otro',         'otro')
ON CONFLICT (slug) DO NOTHING;

-- Platform settings
INSERT INTO platform_settings (key, value, description) VALUES
  ('commission_rate',       '0.20', 'Platform commission rate applied to all ticket sales'),
  ('lock_duration_minutes', '15',   'Minutes a ticket reservation lock is held during checkout')
ON CONFLICT (key) DO NOTHING;
