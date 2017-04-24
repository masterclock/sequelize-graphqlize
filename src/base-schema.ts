import * as gqlLang from 'graphql/language';

const typeDefs = `
        scalar Date
        scalar JSON
        `;

function parseJSONLiteral(ast: any) {
    switch (ast.kind) {
        case gqlLang.Kind.STRING:
        case gqlLang.Kind.BOOLEAN:
            return ast.value;
        case gqlLang.Kind.INT:
        case gqlLang.Kind.FLOAT:
            return parseFloat(ast.value);
        case gqlLang.Kind.OBJECT:
            {
                const value = Object.create(null);
                ast.fields.forEach((field: any) => {
                    value[field.name.value] = parseJSONLiteral(field.value);
                });

                return value;
            }
        case gqlLang.Kind.LIST:
            return ast.values.map(parseJSONLiteral);
        default:
            return null;
    }
}

const resolvers = {
    Date: {
        __parseValue(value: string) {
            return new Date(value); // value from the client
        },
        __serialize(value: Date) {
            return value.getTime(); // value sent to the client
        },
        __parseLiteral(ast: any) {
            if (ast.kind === gqlLang.Kind.INT) {
                return parseInt(ast.value, 10); // ast value is always in string format
            }
            return null;
        },
    },
    JSON: {
        __parseLiteral: parseJSONLiteral,
        __parseValue: (value: any) => value,
        __serialize: (value: any) => value,
    },
};

export const baseSchema = {
    typeDefs,
    resolvers,
};
