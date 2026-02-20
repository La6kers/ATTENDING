import { Html, Head, Main, NextScript, DocumentContext, DocumentInitialProps } from 'next/document';
import Document from 'next/document';

// ============================================================
// Custom Document with CSP Nonce Support
//
// Reads the per-request CSP nonce from the middleware (set via
// x-csp-nonce request header) and applies it to all script/style
// tags. The middleware handles CSP header generation.
//
// See: middleware.ts (section 5 & 6) for CSP policy details.
// ============================================================

interface DocumentProps extends DocumentInitialProps {
  nonce: string;
}

class AttendingDocument extends Document<DocumentProps> {
  static async getInitialProps(ctx: DocumentContext): Promise<DocumentProps> {
    const initialProps = await Document.getInitialProps(ctx);

    // Read nonce from middleware (set on request headers)
    const nonce = (ctx.req?.headers?.['x-csp-nonce'] as string) || '';

    return { ...initialProps, nonce };
  }

  render() {
    const { nonce } = this.props;

    return (
      <Html lang="en">
        <Head nonce={nonce || undefined}>
          {/* Inter Font for Professional Clinical Typography */}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link
            href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Georgia&display=swap"
            rel="stylesheet"
          />
          
          {/* Favicon */}
          <link rel="icon" href="/favicon.ico" />
          
          {/* Meta */}
          <meta name="description" content="ATTENDING AI - Clinical Intelligence Platform" />
          <meta name="theme-color" content="#8b5cf6" />
        </Head>
        <body>
          <Main />
          <NextScript nonce={nonce || undefined} />
        </body>
      </Html>
    );
  }
}

export default AttendingDocument;
