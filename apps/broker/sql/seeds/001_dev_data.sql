INSERT INTO providers (name)
VALUES ('Google Cloud') ON CONFLICT (name) DO NOTHING;


INSERT INTO customers (id, name, business_identifier)
VALUES ('5893a515-4eeb-4b79-bee5-032eceb2bb04'::uuid, 'Devs. Nerds', '99960957000147') ON CONFLICT (business_identifier) DO NOTHING;

WITH customer AS
  (SELECT id
   FROM customers
   WHERE business_identifier='99960957000147' )
INSERT INTO api_keys (key, customer_id)
SELECT 'FvYnyc03PFMXd4rPHsBCQqq_AUtmf8d61jMcXgHbZ4YWvkh1IGr29zhgsKOFqFXvmLNj8w5bEEpSf7bR8q-OAw==',
       id
FROM customer ON CONFLICT (key) DO NOTHING;
