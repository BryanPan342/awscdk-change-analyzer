import {
    Component,
    ComponentUpdateType,
    DependencyRelationship,
    ComponentProperty,
    PropertyPath,
} from "../infra-model";
import { InfraModelDiff } from "./infra-model-diff";
import { 
    ComponentOperation,
    OperationCertainty,
    RenameComponentOperation,
    ReplaceComponentOperation,
    UpdatePropertyComponentOperation
} from "./operations";
import { Transition } from "./transition";

/**
 * Creates the ComponentOperations caused by existing ones
 * @returns the new InfraModelDiff
 */
export function propagateChanges(modelDiff: InfraModelDiff): InfraModelDiff{
    const propagatedOperations: ComponentOperation[] = modelDiff.componentOperations.flatMap(o => {
            if(o instanceof UpdatePropertyComponentOperation){   
                return propagatePropertyOperation(o, modelDiff);
            } else if(o instanceof RenameComponentOperation){
                return propagateRenameOperation(o, modelDiff);
            }
            return [];
    });
    return new InfraModelDiff(
        [...modelDiff.componentOperations, ...propagatedOperations],
        modelDiff.componentTransitions
    );
}

/**
 * Creates the ReplaceComponentOperation for any Component that had a
 * PropertyComponentOperation on a property with UpdateType = REPLACEMENT or POSSIBLE_REPLACEMENT.
 * Creates and recursively propagates the UpdatePropertyComponentOperations for the properties of
 * other Components that depend on this Component.
 * @param compOp the PropertyComponentOperation to be propagated
 * @param modelDiff the original InfraModelDiff
 */
function propagatePropertyOperation(
    compOp: UpdatePropertyComponentOperation,
    modelDiff: InfraModelDiff,
): ComponentOperation[] {
    const componentUpdate = compOp.getUpdateType();
    if(componentUpdate !== ComponentUpdateType.REPLACEMENT
        && componentUpdate !== ComponentUpdateType.POSSIBLE_REPLACEMENT)
        return [];
        
    const componentTransition = compOp.componentTransition;

    const replacementOp = new ReplaceComponentOperation(componentTransition, {
        cause: compOp,
        certainty: componentUpdate === ComponentUpdateType.POSSIBLE_REPLACEMENT
                 ? OperationCertainty.PARTIAL : OperationCertainty.ABSOLUTE,
    });
    
    return [replacementOp, ...propagateReplacementOperation(replacementOp, modelDiff)];
}

function propagateRenameOperation(
    compOp: RenameComponentOperation,
    modelDiff: InfraModelDiff,
): ComponentOperation[] {
    const replacementOp = new ReplaceComponentOperation(compOp.componentTransition, {
        cause: compOp,
        certainty: OperationCertainty.ABSOLUTE,
    });
    
    return [replacementOp, ...propagateReplacementOperation(replacementOp, modelDiff)];
}

function propagateReplacementOperation(replacementOp: ReplaceComponentOperation, modelDiff: InfraModelDiff){

    const newComponent = replacementOp.componentTransition.v2;
    if(!newComponent)
        throw Error("ReplaceComponentOperation has no new Component version");
    
    const dependentRelationships = [...newComponent.incoming]
        .filter(r => r instanceof DependencyRelationship) as DependencyRelationship[];

        
    const replacementPropagations = dependentRelationships.flatMap((rel: DependencyRelationship) => {
        const sourceComponentTransition = modelDiff.getComponentTransition(rel.source);
        
        const consequentPropertyUpdateOp = createUpdateOperationForComponent(modelDiff, sourceComponentTransition, rel.sourcePropertyPath, replacementOp);
        return [consequentPropertyUpdateOp, ...propagatePropertyOperation(consequentPropertyUpdateOp, modelDiff)];
    });

    return [...replacementPropagations];
}

/**
 * Creates an UpdatePropertyComponentOperation for a given component, current property path and cause
 * by finding the previous property path and ComponentProperty.
 * @param componentTransition 
 * @param v2PropertyPath 
 * @param cause 
 * @returns 
 */
function createUpdateOperationForComponent(
    modelDiff: InfraModelDiff,
    componentTransition: Transition<Component>,
    v2PropertyPath: PropertyPath,
    cause: ComponentOperation
){
    const [v1PropertyPath, v1Property] = getV1PropertyForComponentTransition(modelDiff, componentTransition, v2PropertyPath);

    return new UpdatePropertyComponentOperation(
        {v1: v1PropertyPath, v2: v2PropertyPath},
        {
            v1: v1Property,
            v2: componentTransition.v2?.properties.getPropertyInPath(v2PropertyPath)
        },
        componentTransition,
        {certainty: cause.certainty, cause}
    );
}

/**
 * Find the previous PropertyPath and ComponentProperty for a current PropertyPath of a ComponentTransition
 * @param componentTransition 
 * @param v2PropertyPath 
 * @returns [previous PropertyPath, previous ComponentProperty].
 * They can be undefined if the property was inserted
 */
function getV1PropertyForComponentTransition(
    modelDiff: InfraModelDiff,
    componentTransition: Transition<Component>,
    v2PropertyPath: PropertyPath
): [PropertyPath | undefined, ComponentProperty | undefined] {

    const existingUpdateOperation = modelDiff.getTransitionOperations(componentTransition)
        .find(o => o instanceof UpdatePropertyComponentOperation && o.isDirectChange()) as UpdatePropertyComponentOperation | undefined;
    
    const v1PropertyPath = existingUpdateOperation
        ? existingUpdateOperation.getV1Path(v2PropertyPath)
        : undefined;
    
    const v1Property = v1PropertyPath
        ? componentTransition.v1?.properties.getPropertyInPath(v1PropertyPath)
        : undefined;
    
    return [v1PropertyPath, v1Property];
}