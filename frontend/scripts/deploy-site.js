const { execSync } = require('node:child_process');

const stackName = 'signature-approval-workflow-frontend-dev';

function run(command) {
    execSync(command, { stdio: 'inherit' });
}

function getStackOutput(outputKey) {
    const value = execSync(
        `aws cloudformation describe-stacks --stack-name ${stackName} ` +
            `--query "Stacks[0].Outputs[?OutputKey=='${outputKey}'].OutputValue" --output text`,
    )
        .toString()
        .trim();

    if (!value) {
        throw new Error(
            `No se encontró el output "${outputKey}" en el stack "${stackName}". ` +
                'Corré "npx serverless deploy" en frontend/ antes de publicar el sitio.',
        );
    }

    return value;
}

const shellBucket = getStackOutput('ShellBucketName');
const requesterAppBucket = getStackOutput('RequesterAppBucketName');
const approverAppBucket = getStackOutput('ApproverAppBucketName');

run(`aws s3 sync packages/shell/dist s3://${shellBucket}/ --delete`);
run(
    `aws s3 sync packages/requester-app/dist s3://${requesterAppBucket}/requester-app/ --delete`,
);
run(
    `aws s3 sync packages/approver-app/dist s3://${approverAppBucket}/approver-app/ --delete`,
);

console.log('\nSitio publicado.');
