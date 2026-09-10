export interface DnsResolverGateway {
  resolveCname(domain: string): Promise<string[]>;
  resolveTxt(domain: string): Promise<string[][]>;
}
