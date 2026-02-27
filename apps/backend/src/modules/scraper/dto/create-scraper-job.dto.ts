export class CreateScraperJobDto {
    query: string;    // e.g. "Real estate agents in New York"
    location?: string;
    emailDomain?: string;
    limit?: number;   // e.g. 50 leads
}
