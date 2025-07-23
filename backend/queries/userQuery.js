export const userQuery = (function () {
  "use strict";

  let module = {};

    module.getUserByIdQuery = `SELECT * FROM Users WHERE id = $1;`;

    module.getUserByEmailQuery = `SELECT * FROM Users WHERE email = $1;`;

    module.createUserQuery = `
        INSERT INTO Users (email, password)
        VALUES ($1, $2)
        RETURNING *;
    `;

    module.updateUserQuery = `
        UPDATE Users
        SET email = $1, password = $2
        WHERE id = $3
        RETURNING *;
    `;

    module.deleteUserQuery = `DELETE FROM Users WHERE id = $1 RETURNING *;`;

    module.getAllUsersQuery = `SELECT * FROM Users;`;

    module.getUserCountQuery = `SELECT COUNT(*) FROM Users;`;

    module.loginUserQuery = `
        SELECT * FROM Users
        WHERE email = $1 AND password = $2;
    `;

    // For sign in, we'll get user by email and verify password separately
    module.signInUserQuery = `SELECT * FROM Users WHERE email = $1;`;

    module.setStripeCustomerId = `
      UPDATE users SET stripe_customer_id = $1 WHERE email = $2
    `;
    

    
    return module;

})();