# Atelier OAuth 2.0 et OpenID Connect

Sécurisation d'une application React et Spring Boot avec Keycloak.

Module : Sécurité des systèmes distribués

## Description

Application de gestion des demandes dont l'authentification est déléguée à un serveur d'identité Keycloak (OpenID Connect, flux Authorization Code avec PKCE). Le frontend React obtient un Access Token et l'envoie à l'API Spring Boot, qui valide le JWT et applique les autorisations selon les rôles `USER` et `ADMIN`.

- `USER` : créer une demande et consulter ses propres demandes.
- `ADMIN` : consulter toutes les demandes, les valider ou les refuser.

Les demandes sont conservées en mémoire côté backend : elles disparaissent au redémarrage de Spring Boot.

## Architecture

| Composant          | Technologie                      | Port |
|--------------------|----------------------------------|------|
| Serveur d'identité | Keycloak 26 (Docker)             | 8080 |
| API sécurisée      | Spring Boot 3.5, Spring Security | 8081 |
| Frontend           | React avec Vite                  | 5173 |

Rôle de chaque composant :

- Keycloak : Authorization Server et OpenID Provider.
- React : client OAuth 2.0 public (pas de secret côté navigateur).
- Spring Boot : Resource Server qui valide les jetons JWT.

Déroulement : React redirige l'utilisateur vers Keycloak, qui l'authentifie puis renvoie un code d'autorisation. Le client l'échange contre des jetons avec PKCE, puis envoie l'Access Token à l'API dans l'en-tête `Authorization: Bearer`. Spring Security vérifie la signature, l'émetteur, la durée de validité et les rôles.

## Structure du dépôt

```
atelier-oauth2/
  docker-compose.yml        Keycloak
  demandes-api/             API Spring Boot (Maven, Java 17)
  demandes-front/           Frontend React (Vite)
  tests-securite.http       Tests du client HTTP d'IntelliJ
  docs/                     Rapport de l'atelier
```

## Prérequis

- Docker Desktop
- Java 17 ou 21
- Maven (ou le Maven Wrapper fourni)
- Node.js et npm
- IntelliJ IDEA (ou un autre IDE)

## Lancement

### 1. Keycloak

```
docker compose up -d
```

Attendre environ une minute, puis ouvrir http://localhost:8080 (identifiants d'administration du TP : `admin` / `admin`, usage local uniquement).

### 2. Configuration de Keycloak

Dans la console d'administration :

1. Créer le Realm `enset-realm`.
2. Créer le client OpenID Connect `react-client` :
   - Client authentication : désactivé
   - Standard flow : activé
   - Implicit flow : désactivé
   - Direct access grants : désactivé
   - Root URL et Home URL : `http://localhost:5173/`
   - Valid redirect URIs : `http://localhost:5173/*`
   - Web origins : `http://localhost:5173`
   - PKCE Code Challenge Method : `S256`
3. Créer les Realm roles `USER` et `ADMIN`.
4. Créer les utilisateurs (mot de passe non temporaire) :

| Utilisateur | Mot de passe | Rôles       |
|-------------|--------------|-------------|
| alice       | alice123     | USER        |
| bob         | bob123       | USER, ADMIN |

Ces comptes sont destinés uniquement à ce TP en local.

### 3. API Spring Boot

```
cd demandes-api
./mvnw spring-boot:run
```

Sous Windows PowerShell : `.\mvnw.cmd spring-boot:run`

Keycloak doit être démarré avant l'API, car l'émetteur des jetons est vérifié au démarrage. Test : http://localhost:8081/api/public doit répondre avec un message JSON.

### 4. Frontend React

```
cd demandes-front
npm install
npm run dev
```

Ouvrir http://localhost:5173 : l'utilisateur est redirigé vers la page de connexion Keycloak.

## Points d'accès de l'API

| Méthode | URL                       | Accès         | Description                                       |
|---------|---------------------------|---------------|---------------------------------------------------|
| GET     | `/api/public`             | Public        | Message public                                    |
| GET     | `/api/profil`             | Authentifié   | Identifiant et nom d'utilisateur extraits du JWT  |
| GET     | `/api/demandes`           | USER, ADMIN   | Demandes de l'utilisateur connecté                |
| POST    | `/api/demandes`           | USER, ADMIN   | Création d'une demande                            |
| GET     | `/api/admin/demandes`     | ADMIN         | Toutes les demandes                               |
| PATCH   | `/api/admin/demandes/{id}`| ADMIN         | Changement de statut (EN_ATTENTE, VALIDEE, REFUSEE) |

Le propriétaire d'une demande est toujours déduit du claim `sub` du JWT, jamais d'une valeur envoyée par le client.

## Tests de sécurité

Les tests sont dans `tests-securite.http` (client HTTP d'IntelliJ). Les tokens d'Alice et de Bob se récupèrent dans l'onglet Network du navigateur (valeur après `Bearer`). Ils expirent au bout de 5 minutes environ.

| N° | Test                              | Requête                      | Résultat attendu |
|----|-----------------------------------|------------------------------|------------------|
| 1  | Sans token                        | GET /api/demandes            | 401              |
| 2  | Token d'Alice sur l'API admin     | GET /api/admin/demandes      | 403              |
| 3  | Token de Bob sur l'API admin      | GET /api/admin/demandes      | 200              |
| 4  | Token modifié (un caractère)      | GET /api/demandes            | 401              |
| 5  | Alice modifie un statut           | PATCH /api/admin/demandes/1  | 403              |
| 6  | Bob modifie un statut             | PATCH /api/admin/demandes/1  | 200              |

Tous ces résultats ont été vérifiés. Masquer le panneau Administration dans React ne suffit pas : la protection réelle est assurée côté serveur par Spring Security.

## Fonctionnalités supplémentaires

- Bouton Refuser dans l'espace administrateur (PATCH vers le statut `REFUSEE`, réservé à ADMIN).
- Endpoint `GET /api/profil` qui retourne l'identifiant et le nom d'utilisateur extraits du JWT.
- Tests de sécurité : requête sans token, token invalide, USER sur l'API admin, ADMIN qui modifie un statut.

## Remarques de sécurité

- Les jetons restent en mémoire (keycloak-js) et ne sont pas stockés dans `localStorage`.
- Ne jamais publier un Access Token réel : le fichier `tests-securite.http` versionné ne doit contenir que des valeurs de remplacement.
- Le mode `start-dev` de Keycloak et les identifiants `admin` / `admin` ne sont pas adaptés à la production.

## Rapport

Le rapport complet avec les captures d'écran est disponible dans le dossier `docs/`.

## Auteur

Hafssa Miftah Idrissi, année universitaire 2026 / 2027.
