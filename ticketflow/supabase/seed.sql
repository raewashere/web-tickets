-- TicketFlow seed data
-- Artist types
INSERT INTO artist_types (name) VALUES
  ('Banda'),
  ('DJ'),
  ('Solista'),
  ('Dúo'),
  ('Orquesta'),
  ('Comediante'),
  ('Conferencista'),
  ('Otro')
ON CONFLICT DO NOTHING;

-- Event types
INSERT INTO event_types (name) VALUES
  ('Concierto'),
  ('Festival'),
  ('Teatro'),
  ('Stand-up'),
  ('Conferencia'),
  ('Exposición'),
  ('Deportivo'),
  ('Otro')
ON CONFLICT DO NOTHING;

-- Platform settings
INSERT INTO platform_settings (key, value) VALUES
  ('commission_rate', '0.20')
ON CONFLICT (key) DO NOTHING;
