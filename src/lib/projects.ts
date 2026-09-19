import { getCollection, type CollectionEntry } from 'astro:content';
import { readdir } from 'node:fs/promises';
import path from 'node:path';

export type ProjectEntry = CollectionEntry<'projets'>;

export type ProjectRecord = {
  entry: ProjectEntry;
  category: string;
  categoryLabel: string;
  slug: string;
  url: string;
  images: string[];
  cover?: string;
  tone: 'green' | 'blue' | 'sand';
};

const compatibleImageExtensions = new Set([
  '.avif',
  '.gif',
  '.jpeg',
  '.jpg',
  '.png',
  '.svg',
  '.webp',
]);

const categoryLabels: Record<string, string> = {
  graphisme: 'Graphisme',
  'developpement-web': 'Développement web',
  marketing: 'Marketing',
  photo: 'Photo',
  video: 'Vidéo',
};

const tones: ProjectRecord['tone'][] = ['green', 'blue', 'sand'];
const naturalCollator = new Intl.Collator('fr', { numeric: true, sensitivity: 'base' });

export const slugify = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('fr')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

export const getCategoryLabel = (slug: string) => categoryLabels[slug]
  ?? slug.replaceAll('-', ' ').replace(/^./, (letter) => letter.toLocaleUpperCase('fr'));

const encodePublicPath = (...segments: string[]) => `/${segments.map(encodeURIComponent).join('/')}`;

async function findDirectory(parent: string, wantedSlug: string) {
  try {
    const entries = await readdir(parent, { withFileTypes: true });
    return entries.find((entry) => entry.isDirectory() && slugify(entry.name) === wantedSlug)?.name;
  } catch {
    return undefined;
  }
}

async function resolveImageDirectory(category: string, project: string) {
  const roots = [
    { disk: path.join(process.cwd(), 'public', 'images_projets'), publicSegments: ['images_projets'] },
    { disk: path.join(process.cwd(), 'public', 'Images', 'images_projets'), publicSegments: ['Images', 'images_projets'] },
  ];

  for (const root of roots) {
    const categoryDirectory = await findDirectory(root.disk, category);
    if (!categoryDirectory) continue;

    const categoryPath = path.join(root.disk, categoryDirectory);
    const projectDirectory = await findDirectory(categoryPath, project);
    if (!projectDirectory) continue;

    return {
      disk: path.join(categoryPath, projectDirectory),
      publicSegments: [...root.publicSegments, categoryDirectory, projectDirectory],
    };
  }

  return undefined;
}

async function getProjectImages(category: string, project: string) {
  const directory = await resolveImageDirectory(category, project);
  if (!directory) return [];

  try {
    const files = await readdir(directory.disk, { withFileTypes: true });
    return files
      .filter((file) => file.isFile() && !file.name.startsWith('.') && compatibleImageExtensions.has(path.extname(file.name).toLocaleLowerCase()))
      .map((file) => file.name)
      .sort(naturalCollator.compare)
      .map((file) => encodePublicPath(...directory.publicSegments, file));
  } catch {
    return [];
  }
}

function parseEntryId(id: string) {
  const segments = id.split('/').filter(Boolean);
  const project = slugify(segments.at(-1) ?? id);
  const category = slugify(segments.at(-2) ?? 'autres');
  return { category, project };
}

export async function getProjects(): Promise<ProjectRecord[]> {
  const entries = await getCollection('projets');
  const records = await Promise.all(entries.map(async (entry) => {
    const { category, project } = parseEntryId(entry.id);
    const images = await getProjectImages(category, project);
    const toneIndex = [...`${category}/${project}`].reduce((total, character) => total + character.charCodeAt(0), 0) % tones.length;

    return {
      entry,
      category,
      categoryLabel: getCategoryLabel(category),
      slug: project,
      url: `/projets/${category}/${project}`,
      images,
      cover: images[0],
      tone: tones[toneIndex],
    } satisfies ProjectRecord;
  }));

  return records.sort((first, second) =>
    first.entry.data.order - second.entry.data.order
    || naturalCollator.compare(first.entry.data.title, second.entry.data.title));
}

export function getFeaturedProjects(projects: ProjectRecord[]) {
  return projects
    .filter((project) => project.entry.data.featured)
    .sort((first, second) =>
      (first.entry.data.featuredOrder ?? first.entry.data.order)
      - (second.entry.data.featuredOrder ?? second.entry.data.order)
      || first.entry.data.order - second.entry.data.order);
}

export function getProjectCategories(projects: ProjectRecord[]) {
  const preferredOrder = ['graphisme', 'developpement-web', 'marketing', 'photo', 'video'];
  const categories = [...new Set([...preferredOrder, ...projects.map((project) => project.category)])];
  return categories.sort((first, second) => {
    const firstIndex = preferredOrder.indexOf(first);
    const secondIndex = preferredOrder.indexOf(second);
    if (firstIndex === -1 && secondIndex === -1) return naturalCollator.compare(first, second);
    if (firstIndex === -1) return 1;
    if (secondIndex === -1) return -1;
    return firstIndex - secondIndex;
  });
}
