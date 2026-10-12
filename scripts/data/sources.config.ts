export interface RawDataSourceConfig {
  repo: string
  branch: string
  commit: string
  locale: 'zh_CN' | 'en_US'
  tables: readonly string[]
}

export interface AssetSourceConfig {
  repo: string
  commit: string
  avatarPath: string
  portraitPath: string
  itemPath: string
}

export interface PenguinStatsConfig {
  baseUrl: string
  matrixEndpoint: string
}

export interface DataSourcesConfig {
  cacheDir: string
  retries: number
  retryDelayMs: number
  politeDelayMs: number
  sources: {
    cn: RawDataSourceConfig
    en: RawDataSourceConfig
  }
  assets: AssetSourceConfig
  penguinStats: PenguinStatsConfig
}

export const DATA_SOURCES_CONFIG: DataSourcesConfig = {
  cacheDir: '.cache/raw',
  retries: 3,
  retryDelayMs: 1500,
  politeDelayMs: 300,
  sources: {
    cn: {
      repo: 'Kengxxiao/ArknightsGameData',
      branch: 'master',
      commit: '17759cc8cdf37388414145d16262a3a06f3ab25e',
      locale: 'zh_CN',
      tables: [
        'character_table.json',
        'skill_table.json',
        'item_table.json',
        'uniequip_table.json',
        'building_data.json',
        'gacha_table.json',
        'stage_table.json',
        'handbook_info_table.json',
        'char_patch_table.json',
      ],
    },
    en: {
      repo: 'Kengxxiao/ArknightsGameData_YoStar',
      branch: 'main',
      commit: '57010cb5b2afea112cae57daa756b58676ba6850',
      locale: 'en_US',
      tables: [
        'character_table.json',
        'skill_table.json',
        'item_table.json',
        'uniequip_table.json',
        'building_data.json',
        'gacha_table.json',
        'stage_table.json',
        'handbook_info_table.json',
        'char_patch_table.json',
      ],
    },
  },
  assets: {
    repo: 'yuanyan3060/ArknightsGameResource',
    commit: '9bf239661e37766fba585806fb9fa67e79bb679e',
    avatarPath: 'avatar',
    portraitPath: 'portrait',
    itemPath: 'item',
  },
  penguinStats: {
    baseUrl: 'https://penguin-stats.io/PenguinStats/api/v2',
    matrixEndpoint: '/result/matrix?is_personal=false',
  },
} as const

export function getRawTableUrls(
  source: RawDataSourceConfig,
  tableName: string,
): { primaryUrl: string; fallbackUrl: string } {
  const primaryUrl = `https://raw.githubusercontent.com/${source.repo}/${source.commit}/${source.locale}/gamedata/excel/${tableName}`
  const fallbackUrl = `https://cdn.jsdelivr.net/gh/${source.repo}@${source.commit}/${source.locale}/gamedata/excel/${tableName}`

  return { primaryUrl, fallbackUrl }
}
