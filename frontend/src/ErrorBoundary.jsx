import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { erreur: null };
  }

  static getDerivedStateFromError(erreur) {
    return { erreur };
  }

  componentDidCatch(erreur, info) {
    console.error('Erreur capturée:', erreur, info);
  }

  render() {
    if (this.state.erreur) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'sans-serif', textAlign: 'center', background: '#f7f7f5' }}>
          <div>
            <p style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '16px' }}>Une erreur est survenue</p>
            <p style={{ fontSize: '13px', color: '#666', wordBreak: 'break-word', maxWidth: '320px' }}>
              {this.state.erreur && this.state.erreur.message ? this.state.erreur.message : String(this.state.erreur)}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{ marginTop: '16px', padding: '10px 20px', background: '#085041', color: 'white', border: 'none', borderRadius: '8px' }}
            >
              Recharger la page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;