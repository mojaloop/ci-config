#!/usr/bin/env node

const fs = require('fs')

/**
 * This file generates an anchore-cli compatible policy.json file.
 *
 * usage:
 *    ./mojaloop-policy-generator.js <full path of desired output file>
 *
 * for example:
 *    ./mojaloop-policy-generator.js /tmp/mojaloop-policy.json
 *
 * We keep this in a .js file as it allows us to better manage the complicated policy file with comments, etc
 *
 *
 *  Tips for writing a valid file (anchore has no easy policy checker, so if this
 *  file is written incorrectly, it will simply fail and default to the default
 *  policy file
 *
 *  1. The top level `mappings.policy_ids` and `mappings.whitelist_ids` are important,
 *     they must match the ids in the respective `policies` and `whitelists` map
 *  2. You must have AT LEAST ONE policy in the policies map
 *  3. There is no lower limit to the whitelists
 */

if (process.argv.length !== 3) {
  console.warn(`Usage: ./mojaloop-policy.js <full path of desired output file>`)
  process.exit(1)
}

const outputPath = process.argv[2]
console.log(`Exporting policy path: ${outputPath}`)


/**
 * Edit the policy inline here.
 * Based off of the Docker CIS 1.13.0 best practices
 */
const policy = {
  id: 'mojaloop-default',
  name: 'mojaloop-default',
  version: '1_0',
  description: 'Mojaloop default Anchore policy, based on the Docker CIS 1.13.0 image content checks.',
  last_updated: Math.floor((new Date()).getTime()/1000),
  blacklisted_images: [],
  mappings: [
    // Ref: https://docs.anchore.com/current/docs/overview/concepts/policy/policy_mappings/
    // Apply for all `mojaloop/*` derived images
    // Note: this isn't working for the inline-scanner that CircleCI uses, since it rewrites the registry and repository
    {
      comment: 'mapping that matches mojaloop images',
      id: 'mapping-mojaloop',
      registry: '*',
      repository: 'mojaloop/*',
      image: {
        type: 'tag',
        value: '*',
      },
      name: 'mapping-mojaloop',
      policy_ids: [
        'derived_image_dockerfile_checks',
        'cis_file_checks',
        'cis_dockerfile_checks',
        'cis_software_checks',
      ],
      whitelist_ids: [
        'npm-vulnerabilities',
      ]
    },
    // Mapping that applies to 'node' base images
    // If we start using different base images, we should add them here
    {
      comment: 'mapping that matches all `node` base images',
      id: 'mapping-node',
      registry: '*',
      repository: 'node*',
      image: {
        type: 'tag',
        value: '*',
      },
      name: 'mapping-node',
      policy_ids: [
        'cis_file_checks',
        'cis_dockerfile_checks',
        'cis_software_checks',
      ],
      whitelist_ids: [
        'npm-vulnerabilities',
      ]
    },
    // Mapping that applies to all other images
    // While it would be better to apply a special wildcard
    // for mojaloop/* images, during scan time, this repo doesn't exist
    {
      comment: 'default mapping that matches all registry/repo:tag images',
      id: 'mapping-default',
      registry: '*',
      repository: '*',
      image: {
        type: 'tag',
        value: '*',
      },
      name: 'mapping-default',
      policy_ids: [
        'derived_image_dockerfile_checks',
        'cis_file_checks',
        'cis_dockerfile_checks',
        'cis_software_checks',
      ],
      whitelist_ids: [
        'npm-vulnerabilities',
      ]
    }
  ],
  /*
    Refer to the following Anchore docs to understand these policies:
    https://docs.anchore.com/current/docs/overview/concepts/policy/policy_checks/
  */
  policies: [
    {
      id: 'derived_image_dockerfile_checks',
      name: 'Dockerfile Checks',
      comment: 'Extended Dockerfile checks, not applied to base image',
      version: '1_0',
      rules: [
        // Note: Anchore can imply a dockerfile here, so we don't really need one
        // {
        //   action: 'STOP',
        //   comment: 'dockerfile not set',
        //   gate: 'dockerfile',
        //   id: 'dockerfile_checks_dockerfile',
        //   params: [],
        //   trigger: 'no_dockerfile_provided',
        // },
        {
          action: 'STOP',
          comment: 'section 4.1',
          gate: 'dockerfile',
          id: 'dockerfile_checks_root_user',
          params: [
            {
              name: 'users',
              value: 'root,docker'
            },
            {
              name: 'type',
              value: 'blacklist'
            }
          ],
          trigger: 'effective_user'
        }
      ]
    },
    {
      id: 'cis_file_checks',
      name: 'CIS File Checks',
      comment: 'Docker CIS 4.10 checks.',
      version: '1_0',
      rules: [
        {
          action: 'WARN',
          comment: 'section 4.10',
          gate: 'secret_scans',
          id: 'c0e5e302-764d-4b19-9fbd-5c7b0b558673',
          params: [],
          trigger: 'content_regex_checks'
        }
      ],
      version: '1_0'
    },
    {
      comment: 'Docker CIS section 4.1, 4.2, 4.6, 4.7, 4.9 and 5.8 checks.',
      id: 'cis_dockerfile_checks',
      name: 'CIS Dockerfile Checks',
      version: '1_0',
      rules: [
        {
          action: 'STOP',
          comment: 'section 5.8. allow only whitelisted `mojaloop` ports 3000,3001,3002,3007,3008,3080,3081,4001,4002',
          gate: 'dockerfile',
          id: 'ef85285b-801b-48a4-b130-3a35e2d58133',
          params: [
            {
              name: 'ports',
              value: '3000,3001,3002,3007,3008,3080,3081,4001,4002'
            },
            {
              name: 'type',
              value: 'whitelist'
            }
          ],
          trigger: 'exposed_ports'
        },
        {
          action: 'WARN',
          comment: 'section',
          gate: 'dockerfile',
          id: 'e9eacc50-aaac-4241-95ac-790cf0be84da',
          params: [
            {
              name: 'instruction',
              value: 'ADD'
            },
            {
              name: 'check',
              value: 'exists'
            },
            {
              name: 'actual_dockerfile_only',
              value: 'true'
            }
          ],
          trigger: 'instruction'
        },
        {
          action: 'WARN',
          comment: 'section 4.7',
          gate: 'dockerfile',
          id: '2f87d4bf-e963-496a-8b3d-ff90bef46014',
          params: [
            {
              name: 'instruction',
              value: 'RUN'
            },
            {
              name: 'check',
              value: 'like'
            },
            {
              name: 'value',
              value: '(\\s*/bin/sh\\s*-c\\s*)*\\s*apk.*up(date|grade)\\s*$'
            }
          ],
          trigger: 'instruction'
        },
        {
          action: 'WARN',
          comment: 'section 4.7',
          gate: 'dockerfile',
          id: 'ea1b1c11-0633-48cc-8afc-92b252f331b3',
          params: [
            {
              name: 'instruction',
              value: 'RUN'
            },
            {
              name: 'check',
              value: 'like'
            },
            {
              name: 'value',
              value: '(\\s*/bin/sh\\s*-c\\s*)*\\s*yum.*up(date|grade)\\s*$'
            }
          ],
          trigger: 'instruction'
        },
        {
          action: 'WARN',
          comment: 'section 4.7',
          gate: 'dockerfile',
          id: 'c5dbe7b8-b48b-4845-beff-069421d9d1ba',
          params: [
            {
              name: 'instruction',
              value: 'RUN'
            },
            {
              name: 'check',
              value: 'like'
            },
            {
              name: 'value',
              value: '(\\s*/bin/sh\\s*-c\\s*)*\\s*apt(-get)*.*up(date|grade)\\s*$'
            }
          ],
          trigger: 'instruction'
        },
        {
          action: 'STOP',
          comment: 'section 4.2',
          gate: 'dockerfile',
          id: 'f2b27bac-37e5-4ed2-b3f6-da7c76748b49',
          params: [
            {
              name: 'instruction',
              value: 'FROM'
            },
            {
              name: 'check',
              value: 'in'
            },
            {
              name: 'value',
              value: 'node'
            },
            {
              name: 'actual_dockerfile_only',
              value: 'true'
            }
          ],
          trigger: 'instruction'
        },
      ]
    },
    {
      comment: 'Docker CIS section 4.3 and 4.4 checks.',
      id: 'cis_software_checks',
      name: 'CIS Software Checks',
      version: '1_0',
      rules: [
        /* Warn on negligible vulnerabilities */
        {
          action: 'WARN',
          comment: 'section 4.4',
          gate: 'vulnerabilities',
          id: '8955f515-60e2-4483-bdf4-2fe475fe0c8c',
          params: [
            {
              name: 'package_type',
              value: 'all'
            },
            {
              name: 'severity_comparison',
              value: '<='
            },
            {
              name: 'severity',
              value: 'negligible'
            },
            {
              name: 'vendor_only',
              value: 'true'
            }
          ],
          trigger: 'package'
        },
        /* STOP on vulnerabilities above 'low' severity */
        {
          action: 'STOP',
          comment: 'section 4.4',
          gate: 'vulnerabilities',
          id: '0821c410-b0d4-4a25-90d7-aa71b46d7e32',
          params: [
            {
              name: 'package_type',
              value: 'all'
            },
            {
              name: 'severity_comparison',
              value: '>='
            },
            {
              name: 'severity',
              value: 'low'
            },
            {
              name: 'vendor_only',
              value: 'true'
            }
          ],
          trigger: 'package'
        },
        /* STOP on vulnerabilities that have fixes available */
        {
          action: 'STOP',
          comment: 'section 4.4',
          gate: 'vulnerabilities',
          id: '211fa08b-e69a-4165-a0df-05cd3bd0e002',
          params: [
            {
              name: 'package_type',
              value: 'all'
            },
            {
              name: 'severity_comparison',
              value: '>='
            },
            {
              name: 'severity',
              value: 'unknown'
            },
            {
              name: 'fix_available',
              value: 'true'
            }
          ],
          trigger: 'package'
        },
      /* STOP if vuln data is out of date */
        {
          action: 'STOP',
          comment: 'section 4.4',
          gate: 'vulnerabilities',
          id: 'e3a73079-fe16-4de6-9b2f-3982277e57d5',
          params: [
            {
              name: 'max_days_since_sync',
              value: '2'
            }
          ],
          trigger: 'stale_feed_data'
        },
        /* STOP if vuln data isn't available */
        {
          action: 'STOP',
          comment: 'section 4.4',
          gate: 'vulnerabilities',
          id: 'aeff8bdb-82b5-44fd-87ef-d8fdd50893e8',
          params: [],
          trigger: 'vulnerability_data_unavailable'
        }
      ]
    }
  ],
  whitelisted_images: [],
  whitelists: [
    {
      id: 'npm-vulnerabilities',
      name: 'npm-vulnerabilities',
      commend: 'Whitelist for npm vulns we have manually approved',
      version: '1_0',
      items: [
        {
          id: 'rule1',
          gate: 'vulnerabilities',
          trigger_id: 'CVE-2020-8116+*',
        },
        {
          id: 'rule2',
          gate: 'vulnerabilities',
          trigger_id: 'CVE-2020-7598+*',
        },
        {
          id: 'rule3',
          gate: 'vulnerabilities',
          trigger_id: 'CVE-2020-7608+*',
        },
        // Whitelists for https://github.com/mojaloop/project/issues/1292 (mongodb vulnerabilities)
        {
          id: 'rule4',
          gate: 'vulnerabilities',
          trigger_id: 'CVE-2017-15535+*',
        },
        {
          id: 'rule5',
          gate: 'vulnerabilities',
          trigger_id: 'CVE-2020-7610+*',
        },
        {
          id: 'rule6',
          gate: 'vulnerabilities',
          trigger_id: 'CVE-2019-2386+*',
        },
        {
          id: 'rule7',
          gate: 'vulnerabilities',
          trigger_id: 'CVE-2019-2390+*',
        },
        {
          id: 'rule8',
          gate: 'vulnerabilities',
          trigger_id: 'CVE-2019-2389+*',
        },
        {
          id: 'rule9',
          gate: 'vulnerabilities',
          trigger_id: 'CVE-2016-6494+*',
        },
      ]
    }
  ]
};

fs.writeFileSync(outputPath, Buffer.from(JSON.stringify(policy, null, 2)))
