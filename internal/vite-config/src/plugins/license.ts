import type { PluginOption } from 'vite';

import { EOL } from 'node:os';

import { dateUtil, readPackageJSON } from '@vben/node-utils';

/**
 * 用于注入版权信息
 * @returns
 */
async function viteLicensePlugin(
  root = process.cwd(),
): Promise<PluginOption | undefined> {
  const packageJson = await readPackageJSON(root);
  const {
    description = '',
    homepage = '',
    license = 'UNLICENSED',
    name = '',
    version = '',
  } = packageJson;
  const displayName =
    typeof packageJson.displayName === 'string' && packageJson.displayName
      ? packageJson.displayName
      : name;

  return {
    apply: 'build',
    enforce: 'post',
    generateBundle: {
      handler(_options, bundle) {
        const date = dateUtil().format('YYYY-MM-DD');
        const copyrightText = `/*!
  * ${displayName}
  * Version: ${version}
  * License: ${license}
  * Description: ${description}
  * Date Created: ${date}
  * Homepage: ${homepage}
*/
              `.trim();

        for (const [, fileContent] of Object.entries(bundle)) {
          if (fileContent.type === 'chunk' && fileContent.isEntry) {
            // 插入版权信息
            const content = fileContent.code;
            const updatedContent = `${copyrightText}${EOL}${content}`;
            // 更新bundle
            fileContent.code = updatedContent;
          }
        }
      },
      order: 'post',
    },
    name: 'vite:license',
  };
}

export { viteLicensePlugin };
