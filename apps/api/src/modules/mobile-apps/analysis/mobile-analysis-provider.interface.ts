export interface MobileAnalysisProviderInput {
  system: string;
  prompt: string;
}

export interface MobileAnalysisProvider {
  analyze(input: MobileAnalysisProviderInput): Promise<string>;
}
