import { useEffect, useState } from 'react';
import keycloak from './keycloak.js';
import { appelerApi } from './api.js';
import './App.css';

const LIBELLES = {
  EN_ATTENTE: 'En attente',
  VALIDEE: 'Validée',
  REFUSEE: 'Refusée'
};

function Statut({ valeur }) {
  return <span className={`badge badge-${valeur}`}>{LIBELLES[valeur] || valeur}</span>;
}

export default function App() {
  const [objet, setObjet] = useState('');
  const [mesDemandes, setMesDemandes] = useState([]);
  const [toutes, setToutes] = useState([]);
  const [message, setMessage] = useState(null);

  const allRoles = keycloak.tokenParsed?.realm_access?.roles || [];
  const roles = allRoles.filter(r => r === 'USER' || r === 'ADMIN');
  const isAdmin = roles.includes('ADMIN');
  const username = keycloak.tokenParsed?.preferred_username || 'Utilisateur';

  function notifier(texte, type = 'succes') {
    setMessage({ texte, type });
    setTimeout(() => setMessage(null), 4000);
  }

  async function charger() {
    try {
      setMesDemandes(await appelerApi('/api/demandes'));
      if (isAdmin) {
        setToutes(await appelerApi('/api/admin/demandes'));
      }
    } catch (e) {
      notifier('Erreur : ' + e.message, 'erreur');
    }
  }

  useEffect(() => {
    charger();
  }, []);

  async function creer(e) {
    e.preventDefault();
    try {
      await appelerApi('/api/demandes', {
        method: 'POST',
        body: JSON.stringify({ objet })
      });
      setObjet('');
      notifier('Demande créée avec succès.');
      await charger();
    } catch (e) {
      notifier('Erreur : ' + e.message, 'erreur');
    }
  }

  async function changerStatut(id, statut) {
    try {
      await appelerApi(`/api/admin/demandes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ statut })
      });
      notifier(statut === 'VALIDEE' ? 'Demande validée.' : 'Demande refusée.');
      await charger();
    } catch (e) {
      notifier('Erreur : ' + e.message, 'erreur');
    }
  }

  return (
      <>
        <nav className="navbar">
          <div className="navbar-inner">
            <span className="logo">Gestion des demandes</span>
            <div className="user-zone">
              <div className="user-info">
                <span className="user-name">{username}</span>
                <span className="roles">
                {roles.map(r => (
                    <span key={r} className={`role role-${r}`}>{r}</span>
                ))}
              </span>
              </div>
              <button
                  className="btn btn-outline"
                  onClick={() => keycloak.logout({ redirectUri: 'http://localhost:5173/' })}
              >
                Se déconnecter
              </button>
            </div>
          </div>
        </nav>

        <main className="container">
          {message && <div className={`alerte alerte-${message.type}`}>{message.texte}</div>}

          <section className="card">
            <h2>Nouvelle demande</h2>
            <form className="form" onSubmit={creer}>
              <input
                  value={objet}
                  onChange={e => setObjet(e.target.value)}
                  placeholder="Objet de la demande"
                  required
              />
              <button className="btn btn-primary" type="submit">Envoyer</button>
            </form>
          </section>

          <section className="card">
            <h2>Mes demandes</h2>
            {mesDemandes.length === 0 ? (
                <p className="vide">Aucune demande pour le moment.</p>
            ) : (
                <table>
                  <thead>
                  <tr>
                    <th>N°</th>
                    <th>Objet</th>
                    <th>Statut</th>
                  </tr>
                  </thead>
                  <tbody>
                  {mesDemandes.map(d => (
                      <tr key={d.id}>
                        <td>#{d.id}</td>
                        <td>{d.objet}</td>
                        <td><Statut valeur={d.statut} /></td>
                      </tr>
                  ))}
                  </tbody>
                </table>
            )}
          </section>

          {isAdmin && (
              <section className="card card-admin">
                <h2>Administration : toutes les demandes</h2>
                {toutes.length === 0 ? (
                    <p className="vide">Aucune demande enregistrée.</p>
                ) : (
                    <table>
                      <thead>
                      <tr>
                        <th>N°</th>
                        <th>Objet</th>
                        <th>Statut</th>
                        <th className="col-actions">Actions</th>
                      </tr>
                      </thead>
                      <tbody>
                      {toutes.map(d => (
                          <tr key={d.id}>
                            <td>#{d.id}</td>
                            <td>{d.objet}</td>
                            <td><Statut valeur={d.statut} /></td>
                            <td className="col-actions">
                              {d.statut !== 'VALIDEE' && (
                                  <button
                                      className="btn btn-success btn-sm"
                                      onClick={() => changerStatut(d.id, 'VALIDEE')}
                                  >
                                    Valider
                                  </button>
                              )}
                              {d.statut !== 'REFUSEE' && (
                                  <button
                                      className="btn btn-danger btn-sm"
                                      onClick={() => changerStatut(d.id, 'REFUSEE')}
                                  >
                                    Refuser
                                  </button>
                              )}
                            </td>
                          </tr>
                      ))}
                      </tbody>
                    </table>
                )}
              </section>
          )}
        </main>
      </>
  );
}