export interface RawDataSourceConfig {
  repo: string
  branch: string
  commit: string
  locale: 'zh_CN' | 'en' | 'en_US' | 'cn'
  tables: readonly string[]
}

export interface AssetRepoPinnedConfig {
  repo: string
  commit: string
  license: string
  lastCommitDate: string
}

export interface AssetSourceConfig {
  repo: string
  commit: string
  license: string
  lastCommitDate: string
  avatarPath: string
  portraitPath: string
  itemPath: string
  repositories: {
    primary: AssetRepoPinnedConfig & {
      avatarPath: string
      portraitPath: string
      itemPath: string
      skillPath: string
    }
    fexliEquip: AssetRepoPinnedConfig & {
      equipPath: string
    }
    aceshipEquip: AssetRepoPinnedConfig & {
      equipPath: string
    }
  }
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
      repo: 'SanityGoneAK/arknights-gamedata',
      branch: 'main',
      commit: '81c87f5ccc5e26fd9ef10a94606bb77acc3184d3',
      locale: 'cn',
      tables: [
        'character_table.json',
        'skill_table.json',
        'item_table.json',
        'uniequip_table.json',
        'battle_equip_table.json',
        'building_data.json',
        'gacha_table.json',
        'stage_table.json',
        'handbook_info_table.json',
        'char_patch_table.json',
        'gamedata_const.json',
        'skin_table.json',
        'range_table.json',
      ],
    },
    en: {
      repo: 'SanityGoneAK/arknights-gamedata',
      branch: 'main',
      commit: '81c87f5ccc5e26fd9ef10a94606bb77acc3184d3',
      locale: 'en',
      tables: [
        'character_table.json',
        'skill_table.json',
        'item_table.json',
        'uniequip_table.json',
        'battle_equip_table.json',
        'building_data.json',
        'gacha_table.json',
        'stage_table.json',
        'handbook_info_table.json',
        'char_patch_table.json',
        'gamedata_const.json',
        'skin_table.json',
        'range_table.json',
      ],
    },
  },
  assets: {
    repo: 'yuanyan3060/ArknightsGameResource',
    commit: '9bf239661e37766fba585806fb9fa67e79bb679e',
    license: 'GNU Affero General Public License v3.0 (AGPL-3.0)',
    lastCommitDate: '2026-10-09T06:56:38Z',
    avatarPath: 'avatar',
    portraitPath: 'portrait',
    itemPath: 'item',
    repositories: {
      primary: {
        repo: 'yuanyan3060/ArknightsGameResource',
        commit: '9bf239661e37766fba585806fb9fa67e79bb679e',
        license: 'GNU Affero General Public License v3.0 (AGPL-3.0)',
        lastCommitDate: '2026-10-09T06:56:38Z',
        avatarPath: 'avatar',
        portraitPath: 'portrait',
        itemPath: 'item',
        skillPath: 'skill',
      },
      fexliEquip: {
        repo: 'fexli/ArknightsResource',
        commit: 'd7bdc0146f99f6fa88ecdc1bbf79021c012c21c5',
        license: 'None / Custom (Game Fan Assets / Fair Use)',
        lastCommitDate: '2026-10-10T19:45:02Z',
        equipPath: 'equip',
      },
      aceshipEquip: {
        repo: 'Aceship/Arknight-Images',
        commit: '0b28f9562fcadbd644c6225f8f8aefbb500b4d22',
        license: 'None / Custom (Game Fan Assets / Fair Use)',
        lastCommitDate: '2024-05-01T12:46:36Z',
        equipPath: 'equip/icon',
      },
    },
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
