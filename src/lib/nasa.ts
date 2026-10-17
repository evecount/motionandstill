export type SpaceImage = {
  id: string;
  title: string;
  description: string;
  date: string;
  center: string;
  credit: string;
  thumb: string;
  full: string;
};

export const COLLECTIONS = [
  { key: "galaxy", label: "Galaxies", query: "galaxy hubble" },
  { key: "nebula", label: "Nebulae", query: "nebula" },
  { key: "planets", label: "Worlds", query: "jupiter moon io europa saturn" },
  { key: "eclipse", label: "Eclipses", query: "solar eclipse corona" },
  { key: "earth", label: "Earth", query: "earth from space astronaut" },
  { key: "webb", label: "Webb", query: "james webb space telescope image" },
] as const;

export type CollectionKey = (typeof COLLECTIONS)[number]["key"];

const strip = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

export async function fetchCollection(key: CollectionKey): Promise<SpaceImage[]> {
  const c = COLLECTIONS.find((x) => x.key === key)!;
  const url = `https://images-api.nasa.gov/search?q=${encodeURIComponent(c.query)}&media_type=image&page_size=60`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`NASA library unavailable (${res.status})`);
  const json = await res.json();
  type Data = { nasa_id?: string; title?: string; description?: string; date_created?: string; center?: string; secondary_creator?: string; photographer?: string };
  type Item = { data?: Data[]; links?: { href: string }[] };
  const items: SpaceImage[] = (json.collection.items as Item[])
    .flatMap((it): SpaceImage[] => {
      const d = it.data?.[0];
      const thumb = it.links?.[0]?.href;
      if (!d || !thumb || !d.description || !d.nasa_id) return [];
      return [{
        id: d.nasa_id,
        title: d.title ?? "Untitled",
        description: strip(d.description).slice(0, 900),
        date: d.date_created?.slice(0, 10) ?? "",
        center: d.center ?? "NASA",
        credit: d.secondary_creator || d.photographer || `NASA ${d.center ?? ""}`.trim(),
        thumb,
        full: thumb.replace("~thumb", "~large"),
      }];
    })
    .filter((x) => x.description.length > 60);
  // shuffle for discovery
  return items.sort(() => Math.random() - 0.5);
}
