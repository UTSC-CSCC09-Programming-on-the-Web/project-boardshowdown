export const userQuery = (function () {
  "use strict";

  let module = {};

    module.getUserByIdQuery = `SELECT * FROM Users WHERE id = $1;`;

    module.getUserByEmailQuery = `SELECT * FROM Users WHERE email = $1;`;

    module.getUserByUsernameQuery = `SELECT * FROM Users WHERE username = $1;`;

    module.createUserQuery = `
        INSERT INTO Users (email, username, name, profile_picture)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
    `;

    module.updateUserQuery = `
        UPDATE Users
        SET email = $1, username = $2, name = $3, profile_picture = $4
        WHERE id = $5
        RETURNING *;
    `;

    module.deleteUserQuery = `DELETE FROM Users WHERE id = $1 RETURNING *;`;

    module.getAllUsersQuery = `SELECT * FROM Users;`;

    module.getUserCountQuery = `SELECT COUNT(*) FROM Users;`;

    module.setStripeCustomerId = `
      UPDATE users SET stripe_customer_id = $1 WHERE email = $2
    `;
    
    return module;

})();