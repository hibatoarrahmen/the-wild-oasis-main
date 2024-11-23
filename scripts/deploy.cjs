const child_process = require("node:child_process");
const path = require("node:path");

const getCloudFormationOuputValue = (key) => {
  const command = `
    aws cloudformation describe-stacks \
        --stack-name the-wild-oasis \
        --no-paginate \
        --no-cli-pager \
        --output text \
        --query "Stacks[0].Outputs[?OutputKey=='${key}'].OutputValue"
    `;
  try {
    // Execute the command and trim the output
    const result = child_process.execSync(command).toString().trim();
    if (!result) {
      throw new Error(
        `No result for ${key}. Please check the CloudFormation stack.`
      );
    }
    return result;
  } catch (error) {
    console.error(
      `Error retrieving CloudFormation output for ${key}:`,
      error.message
    );
    process.exit(1); // Exit the script with an error code
  }
};

const uploadFiles = () => {
  const sourceDir = path.resolve(path.join(__dirname, "../build"));
  const s3BucketName = getCloudFormationOuputValue("WebAppS3BucketName");

  console.log(`Uploading files from ${sourceDir} to s3://${s3BucketName}`);
  try {
    child_process.execSync(`aws s3 sync ${sourceDir} s3://${s3BucketName}`, {
      stdio: "inherit",
    });
  } catch (error) {
    console.error("Error uploading files to S3:", error.message);
    process.exit(1);
  }
};

const clearCloudFrontCache = () => {
  const distributionId = getCloudFormationOuputValue(
    "CloudFrontDistributionId"
  );
  console.log(`Clearing CloudFront cache for distribution ${distributionId}`);

  const command = `
    aws cloudfront create-invalidation \
        --no-paginate \
        --no-cli-pager \
        --paths "/*" \
        --distribution-id ${distributionId}
    `;
  try {
    child_process.execSync(command, { stdio: "inherit" });
  } catch (error) {
    console.error("Error clearing CloudFront cache:", error.message);
    process.exit(1);
  }
};

uploadFiles();
clearCloudFrontCache();

const domain = getCloudFormationOuputValue("WebAppDomain");
console.log(`Deployment done, visit https://${domain}`);
