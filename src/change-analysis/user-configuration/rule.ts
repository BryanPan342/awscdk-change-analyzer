import { RuleEffect } from 'change-cd-iac-models/rules';

export enum RuleConditionOperator {
    references = '->', // for following dependency relationships
    isReferencedIn = '<-',
    contains = '>>', // for following structural relationships
    isContainedIn = '<<',
    appliesTo = 'appliesTo', // for checking a change against an InfraModel entity
    affects = 'affects', // for checking a change against any directly or indirectly affected InfraModel entity
    equals = '==',
    notEquals = '!=',
    greaterThan = '>',
    greaterOrEqual = '>=',
    lessThan = '<',
    lessOrEqual = '<=',
}

export type Scalar = number | string | boolean;

export type ConditionInput = {
    scalar?: Scalar;
    identifier?: string;
    propertyPath?: string[];
}

export type RuleCondition = {
    operator: RuleConditionOperator;
    leftInput: ConditionInput;
    rightInput: ConditionInput;
}

export type RuleConditions = RuleCondition[];

export type RulePropertyReference = {
    identifier: string,
    propertyPath: string[]
}

export type SelectorFilter = {
    [key: string]: Scalar,
} & {
    _entityType: string,
}

export type Selector = ({
        filter?: SelectorFilter;
    } | {
        propertyReference: RulePropertyReference;
}) & {
    where?: RuleConditions;
}

export function selectorIsPropertyReference(
    s: Selector
): s is {propertyReference: RulePropertyReference} & {where?: RuleConditions} {
    return {}.hasOwnProperty.call(s, 'propertyReference');
}

export type Bindings = {[identifier: string]: Selector};

export interface UserRule {
    let?: Bindings;
    where?: RuleConditions;
    then?: UserRule[];
    effect?: RuleEffectDefinition;
}

export type UserRules = UserRule[];

export type RuleEffectDefinition = {
    target: string,
} & RuleEffect;