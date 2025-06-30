export const userQuery = (function () {
  "use strict";

  let module = {};

    module.getUserByIdQuery = `SELECT * FROM Users WHERE id = $1;`;

    module.getUserByUsernameQuery = `SELECT * FROM Users WHERE username = $1;`;

    module.createUserQuery = `
        INSERT INTO Users (username, password)
        VALUES ($1, $2)
        RETURNING *;
    `;

    module.updateUserQuery = `
        UPDATE Users
        SET username = $1, password = $2
        WHERE id = $3
        RETURNING *;
    `;

    module.deleteUserQuery = `DELETE FROM Users WHERE id = $1 RETURNING *;`;

    module.getAllUsersQuery = `SELECT * FROM Users;`;

    module.getUserCountQuery = `SELECT COUNT(*) FROM Users;`;

    return module;

})();