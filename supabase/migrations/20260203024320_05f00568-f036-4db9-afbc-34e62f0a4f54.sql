-- Cambiar default_position de ENUM a TEXT para soportar posiciones dinámicas
ALTER TABLE user_branch_roles 
  ALTER COLUMN default_position TYPE text;

-- Migrar datos existentes de 'cocinero' a 'sandwichero'
UPDATE user_branch_roles 
SET default_position = 'sandwichero' 
WHERE default_position = 'cocinero';