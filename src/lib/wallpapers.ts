export interface WallpaperPreset {
  id: string;
  name: string;
  url: string;
  sourceUrl: string;
  sourceLabel: string;
}

export const WALLPAPER_PRESETS: WallpaperPreset[] = [
  {
    id: 'assisi-calico',
    name: 'Assisi Calico',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Calico%20cat%2C%20-%20Assisi%2C%20Italy.jpg',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Calico_cat,_-_Assisi,_Italy.jpg',
    sourceLabel: 'Wikimedia Commons',
  },
  {
    id: 'yawning-calico',
    name: 'Yawning Calico',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Calico%20cat%20yawning.jpg',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Calico_cat_yawning.jpg',
    sourceLabel: 'Wikimedia Commons',
  },
  {
    id: 'sakurajima-calico',
    name: 'Sakurajima Calico',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Sakurajima%20Calico%20Cat.jpg',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Sakurajima_Calico_Cat.jpg',
    sourceLabel: 'Wikimedia Commons',
  },
  {
    id: 'camogli-calico',
    name: 'Camogli Calico',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Calico%20cat%2C%20Camogli%2C%20Italy.png',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Calico_cat,_Camogli,_Italy.png',
    sourceLabel: 'Wikimedia Commons',
  },
];

export const DEFAULT_WALLPAPER = WALLPAPER_PRESETS[0].url;
