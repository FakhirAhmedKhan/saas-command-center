export interface DesktopAnalysisProviderInput {
    system: string;
    prompt: string;
}

export interface DesktopAnalysisProvider {
    analyze(input: DesktopAnalysisProviderInput): Promise<string>;
}