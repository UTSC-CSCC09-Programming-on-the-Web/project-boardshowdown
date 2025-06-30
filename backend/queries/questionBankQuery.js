export const questionBankQuery = (function () {
  "use strict";

  let module = {};

  module.getQuestionBankQuery = `SELECT * FROM Questions;`;

  module.getQuestionByIdQuery = `SELECT * FROM Questions WHERE id = $1;`;

  module.getRandomQuestionQuery = `SELECT * FROM Questions ORDER BY RANDOM() LIMIT 1;`;

  module.createQuestionQuery = `
    INSERT INTO Questions (questions, solutions)
    VALUES ($1, $2)
    RETURNING *;
  `;

    module.updateQuestionQuery = `
        UPDATE Questions
        SET questions = $1, solutions = $2
        WHERE id = $3
        RETURNING *;
    `;

    module.deleteQuestionQuery = `DELETE FROM Questions WHERE id = $1 RETURNING *;`;

    return module;

})();