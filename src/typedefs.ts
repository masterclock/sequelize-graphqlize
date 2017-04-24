import * as _ from 'lodash';

import { baseSchema } from './base-schema';

function generateArgs(args: any) {
    return args ? `(${args})` : '';
}

const generateInputField = (field: any, name: string) => {
    const isList = field.list;
    const gqlType = field.gqlType;
    const scalar = field.scalar;
    const required = field.required;
    return `
        ${name} : ${isList ? '[' : ''}${gqlType}${scalar ? '' : 'Input'}${required ? '!' : ''} ${isList ? ']' : ''}`;
};

const generateOutputField = (field: any, name: string) => {
    const args = field.args;
    const isList = field.list;
    const gqlType = field.gqlType;
    const required = field.required;
    return `${name} ${generateArgs(args)} : ${isList ? '[' : ''}${gqlType}${required ? '!' : ''} ${isList ? ']' : ''}`;
};

export function genTypeDefs(types: any) {
    const categories: any = {
        ENUM: (type: any, name: string) => {
            return `enum ${name} {${type.values.join(' ')}}`;
        },
        TYPE: (type: any, name: string) => {
            const output = _.reduce(type.fields, (result, field, fieldName) => {
                return result + generateOutputField(field, fieldName) + ' \n ';
            }, '');

            let result = `
                type ${name} {
                    ${output}
                }`;
            if (type.input) {
                const input = _.reduce(type.fields, (res: string, field: any, fieldName: string) => {
                    if (!field.relation) {
                        return res + generateInputField(field, fieldName) + ' \n ';
                    } else {
                        return res;
                    }

                }, '');
                result += `input ${name}Input {
                    ${input}
                }`;
            }
            return result;
        },
        UNION: (type: any, name: string) => {
            return `union ${name} = ${type.values.join(' | ')}`;
        },
    };

    return _.reduce(types, (result: string, type: any, name: string) => {
        return result + categories[type.category](type, name);
    }, baseSchema.typeDefs);
}
