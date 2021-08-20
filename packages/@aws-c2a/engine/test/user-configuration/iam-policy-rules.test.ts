import { InfraModel } from '@aws-c2a/models';
import { CFParser } from '../../lib/platform-mapping';
import { copy } from '../../lib/private/object';
import { IAM_INLINE_IDENTITY_POLICIES, IAM_INLINE_RESOURCE_POLICIES, IAM_MANAGED_POLICIES, IAM_POLICY_RESOURCES } from '../../lib/private/security-policies';
import { SecurityChangesRules } from '../../lib/security-changes';
import { CUserRule, CUserRules } from '../../lib/user-configuration';
import { arbitraryPolicyStatement, cfnWithPolicyDocument, processRules, firstKey, arbitraryNegativePolicyStatement } from '../utils';

describe('IAM Policy default rules', () => {
  const BEFORE: Record<any, any> = { Resources: {} };

  let rules: CUserRules;
  let oldModel: InfraModel;
  beforeAll(() => {
    rules = [];
    oldModel = new CFParser('root', BEFORE).parse();
  });

  describe('for policy resources', () => {
    IAM_POLICY_RESOURCES.slice(-1).forEach(resource => {
      test(`detect addition of ${resource} resource`, () => {
        // GIVEN
        const after = copy(BEFORE);
        after.Resources[resource.replace(/::/g, '-')] = {
          Type: resource,
          Properties: { PolicyDocument: { Statement: [arbitraryPolicyStatement] } },
        };

        // WHEN
        const newModel = new CFParser('root', after).parse();
        const { graph: g, rulesOutput: result } = processRules(oldModel, newModel, rules);
        const firstVertex = firstKey(result)._id;

        // THEN
        expect(g.v(firstVertex).run()).toHaveLength(1);
        expect(g.v(firstVertex).run()[0]).toMatchObject({ type: 'INSERT' });
        expect(g.v(firstVertex).out('appliesTo').filter({entityType: 'component'}).run()).toMatchObject([
          { subtype: resource },
        ]);
      });

      test(`detect addition to policy statement in ${resource} resource`, () => {
        const rule: any = {
          let: { r: { component: {type: 'Resource' } } },
          then: [{
            description: 'More specific resource definitions in Policy Documents are low risk',
            let: {
              change: { change: {}, where: [
                'change appliesTo r.Properties.PolicyDocument.Statement.*.Effect',
                "change.new == 'Allow'",
              ]},
            },
            effect: {
              risk: 'high',
            },
          }],
        };
        // GIVEN
        const id = resource.replace(/::/g, '-');
        const before = cfnWithPolicyDocument(BEFORE, resource);
        const _oldModel = new CFParser('root', before).parse();

        const after = copy(before);
        after.Resources[id].Properties.PolicyDocument.Statement[0] = arbitraryPolicyStatement;

        // WHEN
        const newModel = new CFParser('root', after).parse();
        const { graph: g, rulesOutput: result } = processRules(_oldModel, newModel, [rule as CUserRule]);
        const firstVertex = firstKey(result)._id;


        // THEN
        expect(g.v(firstVertex).run()).toHaveLength(1);
        expect(g.v(firstVertex).run()[0]).toMatchObject({ propertyOperationType: 'UPDATE' });
        console.log(g.v(firstVertex).out('appliesTo').filter({entityType: 'property'}).run());
        // expect(g.v(firstVertex).out('appliesTo').filter({entityType: 'property'}).run()).toMatchObject([
        //   {},
        //   { value: 'test.amazonaws.com' },
        //   { value: '*' },
        //   { value: 'test:Test' },
        //   { value: 'Allow' },
        // ]);
      });

      test(`addiiton of negative statement to ${resource} not a high risk change`, () => {
        // GIVEN
        const id = resource.replace(/::/g, '-');
        const before = cfnWithPolicyDocument(BEFORE, resource);
        const _oldModel = new CFParser('oldStatementModel', before).parse();

        const after = copy(before);
        after.Resources[id].Properties.PolicyDocument.Statement.push(arbitraryNegativePolicyStatement);


        // WHEN
        const newModel = new CFParser('root', after).parse();
        const { graph: g, rulesOutput: result } = processRules(_oldModel, newModel, rules);

        // THEN
        expect(result.size).toEqual(0);
      });
    });
  });

  describe('for policy properties', () => {
    Object.entries(IAM_MANAGED_POLICIES).slice(-1).forEach(([resource, policies]) => {
      policies.forEach(policy => {
        test(`detect additions to managed policy arns in ${resource} resource`, () => {
          // GIVEN
          const id = resource.replace(/::/g, '-');
          const before = copy(BEFORE);
          before.Resources[id] = {
            Type: resource,
            Properties: { [policy]: ['123456789'] },
          };
          const _oldModel = new CFParser('root', before).parse();

          const after = copy(before);
          after.Resources[id].Properties[policy].push('abcdefghi');

          // WHEN
          const newModel = new CFParser('root', after).parse();
          const { graph: g, rulesOutput: result } = processRules(_oldModel, newModel, rules);
          const firstVertex = firstKey(result)._id;

          // THEN
          expect(g.v(firstVertex).run()).toHaveLength(1);
          expect(g.v(firstVertex).run()[0]).toMatchObject({ propertyOperationType: 'INSERT' });
          expect(g.v(firstVertex).out('appliesTo').filter({entityType: 'property'}).run()).toMatchObject([
            { value: 'abcdefghi' },
            { value: 'abcdefghi' }, // Unsure why there are two of these..
          ]);
        });
      });
    });

    Object.entries(IAM_INLINE_IDENTITY_POLICIES).slice(-1).forEach(([resource, policies]) => {
      policies.forEach(policy => {
        test(`detect statement additions to inline identity policies in ${resource} resource`, () => {
          // GIVEN
          const id = resource.replace(/::/g, '-');
          const before = copy(BEFORE);
          before.Resources[id] = {
            Type: resource,
            Properties: {
              [policy]: {
                Policies: [
                  {
                    PolicyDocument: { Statement: [ arbitraryPolicyStatement ] },
                  },
                ],
              },
            },
          };
          const _oldModel = new CFParser('root', before).parse();

          const after = copy(before);
          after.Resources[id].Properties[policy].Policies[0].PolicyDocument.Statement.push(arbitraryPolicyStatement);

          // WHEN
          const newModel = new CFParser('root', after).parse();
          const { graph: g, rulesOutput: result } = processRules(_oldModel, newModel, rules);
          const firstVertex = firstKey(result)._id;

          // THEN
          expect(g.v(firstVertex).run()).toHaveLength(1);
          expect(g.v(firstVertex).run()[0]).toMatchObject({ propertyOperationType: 'INSERT' });
          expect(g.v(firstVertex).out('appliesTo').filter({entityType: 'property'}).run()).toMatchObject([
            {},
            { value: 'test.amazonaws.com' },
            { value: '*' },
            { value: 'test:Test' },
            { value: 'Allow' },
          ]);
        });

        test(`detect policy additions to inline identity policies in ${resource} resource`, () => {
          // GIVEN
          const id = resource.replace(/::/g, '-');
          const before = copy(BEFORE);
          before.Resources[id] = {
            Type: resource,
            Properties: {
              [policy]: {
                Policies: [],
              },
            },
          };
          const _oldModel = new CFParser('root', before).parse();

          const after = copy(before);
          after.Resources[id].Properties[policy].Policies.push({
            PolicyDocument: {
              Statement: [arbitraryPolicyStatement],
            },
          });

          // WHEN
          const newModel = new CFParser('root', after).parse();
          const { graph: g, rulesOutput: result } = processRules(_oldModel, newModel, rules);
          const firstVertex = firstKey(result)._id;

          // THEN
          expect(g.v(firstVertex).run()).toHaveLength(1);
          expect(g.v(firstVertex).run()[0]).toMatchObject({ propertyOperationType: 'INSERT' });
          expect(g.v(firstVertex).out('appliesTo').filter({entityType: 'property'}).run()).toMatchObject([
            {},
            { value: 'test.amazonaws.com' },
            { value: '*' },
            { value: 'test:Test' },
            { value: 'Allow' },
          ]);
        });
      });
    });

    Object.entries(IAM_INLINE_RESOURCE_POLICIES).slice(-1).forEach(([resource, policies]) => {
      policies.forEach(policy => {
        test(`detect statement additions to inline resource policies in ${resource} resource`, () => {
          // GIVEN
          const id = resource.replace(/::/g, '-');
          const before = copy(BEFORE);
          before.Resources[id] = {
            Type: resource,
            Properties: {
              [policy]: {
                Statement: [ arbitraryPolicyStatement ],
              },
            },
          };
          const _oldModel = new CFParser('root', before).parse();

          const after = copy(before);
          after.Resources[id].Properties[policy].Statement.push(arbitraryPolicyStatement);

          // WHEN
          const newModel = new CFParser('root', after).parse();
          const { graph: g, rulesOutput: result } = processRules(_oldModel, newModel, rules);
          const firstVertex = firstKey(result)._id;

          // THEN
          expect(g.v(firstVertex).run()).toHaveLength(1);
          expect(g.v(firstVertex).run()[0]).toMatchObject({ propertyOperationType: 'INSERT' });
          expect(g.v(firstVertex).out('appliesTo').filter({entityType: 'property'}).run()).toMatchObject([
            {},
            { value: 'test.amazonaws.com' },
            { value: '*' },
            { value: 'test:Test' },
            { value: 'Allow' },
          ]);
        });
      });
    });
  });
});
