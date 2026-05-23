import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';

export function initTracing(serviceName: string): void {
  const endpoint =
    process.env['OTEL_EXPORTER_OTLP_ENDPOINT'] ?? 'http://jaeger:4318/v1/traces';

  const sdk = new NodeSDK({
    resource: new Resource({ 'service.name': serviceName }),
    traceExporter: new OTLPTraceExporter({ url: endpoint }),
    instrumentations: [
      getNodeAutoInstrumentations({
        // fs and net/dns produce too many spans with little diagnostic value
        '@opentelemetry/instrumentation-fs': { enabled: false },
        '@opentelemetry/instrumentation-net': { enabled: false },
        '@opentelemetry/instrumentation-dns': { enabled: false },
      }),
    ],
  });

  sdk.start();

  process.on('SIGTERM', () => {
    sdk.shutdown().catch(console.error).finally(() => process.exit(0));
  });
}

export { trace, context } from '@opentelemetry/api';
