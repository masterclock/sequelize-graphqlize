const bodyParser = require('body-parser');
const express = require('express');
const { graphiqlExpress, graphqlExpress } = require('graphql-server-express');
const { makeExecutableSchema } = require('graphql-tools');
const Sequelize = require('sequelize');
const dataloaderSequelize = require('dataloader-sequelize').default;

const { parse } = require('../dist/parse');
const { genTypeDefs } = require('../dist/typedefs');
const { genResolvers } = require('../dist/gen-resolvers');

const sequelize = new Sequelize('database', 'username', 'passsword', {
    dialect: 'sqlite',
});
// dataloaderSequelize(sequelize);

const User = sequelize.define('User', {
    username: {
        type: Sequelize.STRING,
    },
}, {
    classMethods: {
        login: function(credentials) {
            console.log('login: ', credentials);
            return {
                token: '1234567890',
                ttl: 1203490,
                userId: '1',
            };
        },
    },
});

sequelize.models.User.login = function(credentials) {
    console.log('login: ', credentials);
    return {
        token: '123456789',
        ttl: 12,
        userId: '1',
    };
};

sequelize.models.User.graphQL = {
    methods: [
        {
            isStatic: true,
            name: 'login',
            accepts: [
                { arg: 'credentials', type: 'object', },
            ],
            returns: [{
                root: true, type: 'object', 
            }],
            graphQL: {
                singular: true,
            }
        }
    ]
};

sequelize.models.User.login();
User.login();

const Customer = sequelize.define('Customer', {
    name: {
        type: Sequelize.STRING,
    }
});

const Machine = sequelize.define('Machine', {
    model: {
        type: Sequelize.STRING,
    }
});

User.belongsTo(Customer, {as: 'customer'});
Customer.hasMany(Machine);
Machine.belongsTo(Customer, {as: 'ownerCustomer'});

sequelize.sync().then(async () => {
    const apple_u1 = await User.create({
        username: 'Apple_u1',
    });
    const bell_u1 = await User.create({
        username: 'Bell_u1',
    });
    const apple = await Customer.create({
        name: 'Apple',
    });
    const bell = await Customer.create({
        name: 'Bell',
    });
    const X40_1 = await Machine.create({
        model: 'X40',
    });
    const X40_2 = await Machine.create({
        model: 'X40',
    });
    const X50_1 = await Machine.create({
        model: 'X50',
    });
    const X60_1 = await Machine.create({
        model: 'X60',
    });

    await apple_u1.setCustomer(apple);
    await bell_u1.setCustomer(bell);

    await apple.addMachine(X40_1);
    await apple.addMachine(X50_1);
    await bell.addMachine(X40_2);
    await bell.addMachine(X60_1);
});

const ast = parse(sequelize);
console.log(ast);

const typeDefs = genTypeDefs(ast);
const resolvers = genResolvers(ast);

const schema = makeExecutableSchema({
    typeDefs: typeDefs,
    resolvers: resolvers,
})

const app = express();
app.use('/graphql', bodyParser.json(), graphqlExpress({
    schema: schema
}));

app.use('/graphiql', graphiqlExpress({
    endpointURL: '/graphql'
}));

app.listen(3000);
