-- Seed Mike + Santi as admins. Add real sellers via the admin UI.
INSERT OR IGNORE INTO sellers (email, name, role, active) VALUES
  ('mike@colguides.com',     'Mike Chartrand',  'admin',  1),
  ('santiago@colguides.com', 'Santiago Santos', 'admin',  1),
  ('mike@mikec.pro',         'Mike Chartrand',  'admin',  1);
