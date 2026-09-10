import dns from "node:dns/promises";
import type { DnsResolverGateway } from "../../application/domain/dns-gateway";

export class NodeDnsGateway implements DnsResolverGateway {
  async resolveCname(domain: string): Promise<string[]> {
    try {
      return await dns.resolveCname(domain);
    } catch {
      return [];
    }
  }

  async resolveTxt(domain: string): Promise<string[][]> {
    try {
      return await dns.resolveTxt(domain);
    } catch {
      return [];
    }
  }
}
