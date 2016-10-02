let publicScope = {
    scope_id: 'public', // Required, Unique, String
    scope_name: 'Short scope name', // Optional, String|null
    scope_description: 'Description of the scope' // Optional, String|null
};

let loggedInScope = {
    scope_id: 'loggedin',
    scope_name: 'Logged in user scope',
    scope_description: 'Scope for logged in users'
};

let premiumScope = {
    scope_id: 'premium',
    scope_name: 'Premium user scope',
    scope_description: 'Scope for premium users'
};

let clients = [];

let webClient = {
    client_id: 'someClientId', // Required, Unique, String
    client_secret: 'someClientSecret', // Required, String
    client_name: 'Short client name', // Optional, String|null
    client_description: 'Description of the client', // Optional, String|null
    scopes: {
        client_credentials: [publicScope], // Optional, [ScopeObject]
        user_credentials: [loggedInScope, premiumScope] // Optional, [ScopeObject]
    },
    refresh_token: true // Optional, Bool (defualt: true)
};

clients.push(webClient);

let myProject = {
    project_id: 'someProject', // Required, Unique, String
    project_name: 'Short project name', // Optional, String
    project_description: 'Description of the project', // Optional, String,
    clients: clients // Required, [ClientObject]
};

let serverCongfig = {
    projects: [myProject], // Required, [ProjectObject]
    connectionSettings: 'mongodb://localhost/noauth' // Required, String
};

module.exports = serverCongfig;