import { ApiConfig, Environment, Mission, Project } from '../types';

export const CONFIGURATION_EXPORT_SCHEMA = 'agenteval.configuration-export';
export const CONFIGURATION_EXPORT_VERSION = 1;
export const DEFAULT_EVALUATOR_MODEL = 'gemini-3.5-flash';

const DEFAULT_API_CONFIG: ApiConfig = {
    post_url: '',
    get_url: '',
    auth_header: '',
    payload_template: '',
    response_path: '',
    polling_interval: 2000,
    max_timeout: 30,
};

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

const normalizeApiConfig = (value: unknown): ApiConfig => {
    const rawConfig = isRecord(value) ? value : {};

    return {
        post_url: typeof rawConfig.post_url === 'string' ? rawConfig.post_url : '',
        get_url: typeof rawConfig.get_url === 'string' ? rawConfig.get_url : '',
        auth_header: typeof rawConfig.auth_header === 'string' ? rawConfig.auth_header : '',
        payload_template:
            typeof rawConfig.payload_template === 'string' ? rawConfig.payload_template : '',
        response_path: typeof rawConfig.response_path === 'string' ? rawConfig.response_path : '',
        polling_interval:
            typeof rawConfig.polling_interval === 'number'
                ? rawConfig.polling_interval
                : DEFAULT_API_CONFIG.polling_interval,
        max_timeout:
            typeof rawConfig.max_timeout === 'number'
                ? rawConfig.max_timeout
                : DEFAULT_API_CONFIG.max_timeout,
    };
};

const normalizeVariables = (value: unknown): Record<string, unknown[]> => {
    if (!isRecord(value)) return {};

    return Object.fromEntries(
        Object.entries(value).map(([key, values]) => [key, Array.isArray(values) ? values : []])
    );
};

const normalizeEnvironments = (value: unknown): Environment[] => {
    if (!Array.isArray(value)) return [];

    return value.map((environment, index) => {
        if (
            !isRecord(environment) ||
            typeof environment.id !== 'string' ||
            typeof environment.name !== 'string'
        ) {
            throw new Error(
                `Invalid AgentEval configuration export: environment at index ${index} is not valid.`
            );
        }

        return {
            ...environment,
            api_config: normalizeApiConfig(environment.api_config),
        } as Environment;
    });
};

const assertProjectArray = (value: unknown): Project[] => {
    if (!Array.isArray(value)) {
        throw new Error('Invalid AgentEval configuration export: data.projects must be an array.');
    }

    return value.map((project, index) => {
        if (!isRecord(project) || typeof project.id !== 'string' || typeof project.name !== 'string') {
            throw new Error(`Invalid AgentEval configuration export: data.projects[${index}] is not a valid project.`);
        }

        return {
            ...project,
            description: typeof project.description === 'string' ? project.description : '',
            documentation: typeof project.documentation === 'string' ? project.documentation : '',
            system_prompts: Array.isArray(project.system_prompts) ? project.system_prompts : [],
            environments: normalizeEnvironments(project.environments),
        } as Project;
    });
};

const assertMissionArray = (value: unknown): Mission[] => {
    if (!Array.isArray(value)) {
        throw new Error('Invalid AgentEval configuration export: data.missions must be an array.');
    }

    return value.map((mission, index) => {
        if (!isRecord(mission) || typeof mission.id !== 'string' || typeof mission.titulo !== 'string') {
            throw new Error(`Invalid AgentEval configuration export: data.missions[${index}] is not a valid mission.`);
        }

        return {
            ...mission,
            target_system_prompt:
                typeof mission.target_system_prompt === 'string' ? mission.target_system_prompt : '',
            tester_persona: typeof mission.tester_persona === 'string' ? mission.tester_persona : '',
            mission_goal: typeof mission.mission_goal === 'string' ? mission.mission_goal : '',
            variables: normalizeVariables(mission.variables),
            max_turns: typeof mission.max_turns === 'number' ? mission.max_turns : 10,
            api_config: normalizeApiConfig(mission.api_config),
            evaluation_criteria: Array.isArray(mission.evaluation_criteria)
                ? mission.evaluation_criteria
                : [],
        } as Mission;
    });
};

const assertSettings = (value: unknown): ExportedSettings => {
    if (!isRecord(value)) {
        throw new Error('Invalid AgentEval configuration export: data.settings must be an object.');
    }

    return {
        geminiApiKey: typeof value.geminiApiKey === 'string' ? value.geminiApiKey : '',
        evaluatorModel:
            typeof value.evaluatorModel === 'string' && value.evaluatorModel.trim()
                ? value.evaluatorModel
                : DEFAULT_EVALUATOR_MODEL,
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
