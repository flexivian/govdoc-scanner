import inquirer from "inquirer";
import stringSimilarity from "string-similarity";
import pkg from "greek-utils";
const { toGreek } = pkg;

// Finds the best match for a user's input from a list of options using
export async function findAndConfirmMatch(
  userInput,
  optionsList,
  filterName,
  similarityThreshold = 0.4
) {
  if (!userInput || !userInput.trim()) {
    return null;
  }

  const validOptions = optionsList.filter(
    (o) => typeof o === "string" && o.trim() !== ""
  );
  if (validOptions.length === 0) {
    return null;
  }

  // Greeklish to Greek conversion
  userInput = toGreek(userInput);

  // Find the best match.
  const { bestMatch } = stringSimilarity.findBestMatch(
    userInput.toUpperCase(),
    validOptions.map((o) => o.toUpperCase())
  );

  // Find the original, correctly-cased option from our list.
  const matchedOption = validOptions.find(
    (o) => o.toUpperCase() === bestMatch.target
  );

  // Reject if match is too weak
  if (!matchedOption || bestMatch.rating < similarityThreshold) {
    console.log(
      `\n⚠️  Warning: Could not find a close match for '${userInput}' in ${filterName}. Ignoring this filter.`
    );
    return null;
  }

  if (bestMatch.rating < 1.0) {
    const { confirmed } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirmed",
        message: `Did you mean '${matchedOption}' for the ${filterName} filter?`,
        default: true,
      },
    ]);

    if (confirmed) {
      console.log(`Using filter: ${matchedOption}`);
      return matchedOption;
    } else {
      console.log(
        `Please try again with a more accurate input for the ${filterName} filter.`
      );
      return null;
    }
  }

  // Return the original, correct string for a perfect match.
  return matchedOption;
}
