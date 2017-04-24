export interface TypeOptions {
    type: string | TypeOptions;
    list: boolean;
    required: boolean;
}
/**
 * Checks the type of the sequelize data type and
 * returns the corresponding type in GraphQL
 * @param  {Object} sequelizeType
 * @param  {Object} sequelizeTypes
 * @return {Function} GraphQL type declaration
 */
const typeMapperStruct = (sequelizeType: any, sequelizeTypes: any): TypeOptions => {

  // did the user supply a mapping function?
  // use their mapping, if it returns truthy
  // else use our defaults

  const {
    BOOLEAN,
    ENUM,
    FLOAT,
    CHAR,
    DECIMAL,
    DOUBLE,
    INTEGER,
    BIGINT,
    STRING,
    TEXT,
    UUID,
    DATE,
    DATEONLY,
    TIME,
    ARRAY,
    VIRTUAL,
  } = sequelizeTypes;

  // Regex for finding special characters
  const specialChars = /[^a-z\d_]/i;

  if (sequelizeType instanceof BOOLEAN) {
    return {
        type: 'Boolean',
        list: false,
        required: false,
    };
  }

  if (sequelizeType instanceof FLOAT ||
    sequelizeType instanceof DOUBLE) {
    return {
        type: 'Float',
        list: false,
        required: false,
    };
  }

  if (sequelizeType instanceof INTEGER) {
    return {
        type: 'Int',
        list: false,
        required: false,
    };
  }

  if (sequelizeType instanceof CHAR ||
    sequelizeType instanceof STRING ||
    sequelizeType instanceof TEXT ||
    sequelizeType instanceof UUID ||
    sequelizeType instanceof DATE ||
    sequelizeType instanceof DATEONLY ||
    sequelizeType instanceof TIME ||
    sequelizeType instanceof BIGINT ||
    sequelizeType instanceof DECIMAL) {
    return {
        type: 'String',
        list: false,
        required: false,
    };
  }

  if (sequelizeType instanceof ARRAY) {
    const elementType = typeMapperStruct(sequelizeType.type, sequelizeTypes);
    return {
        type: elementType,
        list: true,
        required: false,
    };
  }

//   if (sequelizeType instanceof ENUM) {
//     return new GraphQLEnumType({
//       name: 'x',
//       values: sequelizeType.values.reduce((obj: any, value: any) => {
//         let sanitizedValue = value;
//         if (specialChars.test(value)) {
//           sanitizedValue = value.split(specialChars).reduce((reduced: any, val: any, idx: any) => {
//             let newVal = val;
//             if (idx > 0) {
//               newVal = `${val[0].toUpperCase()}${val.slice(1)}`;
//             }
//             return `${reduced}${newVal}`;
//           });
//         }
//         obj[sanitizedValue] = { value };
//         return obj;
//       }, {}),
//     });
//   }

  if (sequelizeType instanceof VIRTUAL) {
    const returnType = sequelizeType.returnType
      ? typeMapperStruct(sequelizeType.returnType, sequelizeTypes)
      : 'JSON';
    return {
        type: returnType,
        list: false,
        required: false,
    };
  }

  throw new Error(`Unable to convert ${sequelizeType.key || sequelizeType.toSql()} to a GraphQL type`);

};

export const typeStringify = (type: TypeOptions): string => {
  let elementType;
  if (typeof type.type === 'string') {
    elementType = type.type;
  } else {
    elementType = typeStringify(type.type);
  }
  if (type.list) {
    elementType = `[${elementType}]`;
  }
  if (type.required) {
    elementType = `${elementType}!`;
  }
  return elementType;
};

export const typeMapper = (sequelizeType: any, sequelizeTypes: any): string => {
  const typeStruct = typeMapperStruct(sequelizeType, sequelizeTypes);
  return typeStringify(typeStruct);
};
