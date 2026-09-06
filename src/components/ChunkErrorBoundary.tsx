import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

const RELOAD_FLAG = "chunk-error-reloaded";

/** Erros típicos quando o navegador tenta baixar um pedaço (chunk) de
 * código que não existe mais, porque o site foi atualizado depois que
 * a página foi carregada — muito comum em celular, onde a aba fica
 * aberta/em cache por mais tempo. */
const isChunkLoadError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  return /failed to fetch dynamically imported module|loading chunk|dynamically imported module/i.test(message);
};

class ChunkErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (isChunkLoadError(error)) {
      // Provavelmente o site foi atualizado depois que essa aba abriu.
      // Recarrega uma única vez automaticamente (evita loop infinito
      // se o problema for outro).
      if (!sessionStorage.getItem(RELOAD_FLAG)) {
        sessionStorage.setItem(RELOAD_FLAG, "1");
        window.location.reload();
        return;
      }
    }
    console.error("Erro na aplicação:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
          <p className="text-lg font-medium">Não foi possível carregar a página</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            Isso pode acontecer logo depois de uma atualização do site. Tente recarregar.
          </p>
          <button
            onClick={() => {
              sessionStorage.removeItem(RELOAD_FLAG);
              window.location.reload();
            }}
            className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Recarregar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ChunkErrorBoundary;
