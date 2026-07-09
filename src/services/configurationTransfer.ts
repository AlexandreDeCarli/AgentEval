import { Mission, Project } from '../types';

export const CONFIGURATION_EXPORT_SCHEMA = 'agenteval.configuration-export';
export const CONFIGURATION_EXPORT_VERSION = 1;

export interface ExportedSettings {
    geminiApiKey: string;
    evaluatorModel: string;
}

export interface ConfigurationTransferData {
    projects: Project[];
    missions: Mission[];
    settings: ExportedSettings;
}

export interface ConfigurationExportFile {
    schema: typeof CONFIGURATION_EXPORT_SCHEMA;
    version: typeof CONFIGURATION_EXPORT_VERSION;
    exported_at: string;
    data: ConfigurationTransferData;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const assertProjectArray = (value: unknown): Project[] => {
    if (!Array.isArray(value)) {
        throw new Error('Invalid AgentEval configuration export: data.projects must be an array.');
    }

    value.forEach((project, index) => {
        if (!isRecord(project) || typeof project.id !== 'string' || typeof project.name !== 'string') {
            throw new Error(`Invalid AgentEval configuration export: data.projects[${index}] is not a valid project.`);
        }
    });

    return value as Project[];
};

const assertMissionArray = (value: unknown): Mission[] => {
    if (!Array.isArray(value)) {
        throw new Error('Invalid AgentEval configuration export: data.missions must be an array.');
    }

    value.forEach((mission, index) => {
        if (!isRecord(mission) || typeof mission.id !== 'string' || typeof mission.titulo !== 'string') {
            throw new Error(`Invalid AgentEval configuration export: data.missions[${index}] is not a valid mission.`);
        }
    });

    return value as Mission[];
};

const assertSettings = (value: unknown): ExportedSettings => {
    if (!isRecord(value)) {
        throw new Error('Invalid AgentEval configuration export: data.settings must be an object.');
    }

    return {
        geminiApiKey: typeof value.geminiApiKey === 'string' ? value.geminiApiKey : '',
        evaluatorModel: typeof value.evaluatorModel === 'string' ? value.evaluatorModel : '',
    };
};

export const createConfigurationExport = (
    data: ConfigurationTransferData,
    exportedAt = new Date().toISOString()
): ConfigurationExportFile => ({
    schema: CONFIGURATION_EXPORT_SCHEMA,
    version: CONFIGURATION_EXPORT_VERSION,
    exported_at: exportedAt,
    data: {
        projects: data.projects,
        missions: data.missions,
        settings: data.settings,
    },
});

export const parseConfigurationExport = (rawJson: string): ConfigurationTransferData => {
    let parsed: unknown;

    try {
        parsed = JSON.parse(rawJson);
    } catch {
        throw new Error('Invalid AgentEval configuration export: file is not valid JSON.');
    }

    if (!isRecord(parsed)) {
        throw new Error('Invalid AgentEval configuration export: expected a versioned export object.');
    }

    if (parsed.schema !== CONFIGURATION_EXPORT_SCHEMA || parsed.version !== CONFIGURATION_EXPORT_VERSION) {
        throw new Error('Invalid AgentEval configuration export: unsupported AgentEval configuration export format.');
    }

    if (!isRecord(parsed.data)) {
        throw new Error('Invalid AgentEval configuration export: data must be an object.');
    }

    return {
        projects: assertProjectArray(parsed.data.projects),
        missions: assertMissionArray(parsed.data.missions),
        settings: assertSettings(parsed.data.settings),
    };
};
