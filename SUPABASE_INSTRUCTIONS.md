
# Configuración de Base de Datos y Storage (Supabase)

Copia y pega el siguiente código en el **SQL Editor** de tu panel de Supabase.

```sql
-- ==============================================================================
-- 1. SAVE SLOTS (Persistencia de Jugador)
-- ==============================================================================

create table if not exists save_slots (
  user_id uuid references auth.users not null,
  slot_index int not null,
  data jsonb not null,
  summary jsonb,
  updated_at timestamptz default now(),
  primary key (user_id, slot_index)
);

alter table save_slots enable row level security;

create policy "Users can select their own saves" on save_slots for select using (auth.uid() = user_id);
create policy "Users can insert their own saves" on save_slots for insert with check (auth.uid() = user_id);
create policy "Users can update their own saves" on save_slots for update using (auth.uid() = user_id);

-- ==============================================================================
-- 2. GAME DEFINITIONS (Contenido Dinámico / Admin Dashboard)
-- ==============================================================================

create table if not exists game_definitions (
  id text primary key,
  category text not null,
  data jsonb not null,
  created_at timestamptz default now()
);

alter table game_definitions enable row level security;

create policy "Everyone can read game definitions" on game_definitions for select using (true);
create policy "Authenticated users can manage definitions" on game_definitions for all using (auth.role() = 'authenticated');
```

## Configuración de Storage (Imágenes y Assets)

Para poder subir tus propios sprites desde el Admin Dashboard:

1. Ve a la sección **Storage** en tu Dashboard de Supabase.
2. Haz clic en **"New Bucket"**.
3. Ponle de nombre: `game-assets`.
4. **IMPORTANTE**: Activa la casilla de **"Public Bucket"**. Esto permitirá que el motor de juego cargue las imágenes sin necesidad de firmar URLs.
5. Haz clic en **Create Bucket**.

Una vez hecho esto, los botones de **"Upload Image"** en el panel `/admin` funcionarán automáticamente.
