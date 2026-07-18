export type SceneId =
  | "grassland"
  | "ocean"
  | "cave"
  | "magma"
  | "snowfield"
  | "power-plant";

export type PokemonRole = "mascot" | "encounter" | "legendary";

export interface Pokemon {
  id: number;
  name: string;
  types: string[];
  flavor: string;
  role?: PokemonRole;
}

export interface SceneColors {
  primary: string;
  secondary: string;
  accent: string;
  surface: string;
  ink: string;
}

export interface Scene {
  id: SceneId;
  no: string;
  name: string;
  nameEn: string;
  location: string;
  promptSymbol: string;
  flavor: string;
  designNote: string;
  colors: SceneColors;
  pokemon: Pokemon[];
  legendaries: Pokemon[];
  legendaryHint: string;
  tags: string[];
}

export const pokemonSpriteUrl = (p: Pokemon): string =>
  `pokemon/${String(p.id).padStart(3, "0")}.png`;
