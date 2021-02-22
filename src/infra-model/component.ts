import { ComponentProperty } from "./component-property";
import { Relationship } from "./relationship";

interface ComponentOptions {
    readonly subtype?: string;
    readonly properties: ComponentProperty;
}

/**
 * Component is any element of the infrastructure definition
 * 
 * Examples include resources, resource groups, sets of configurations, variables,
 * or any other entity that influences the infrastructure deployment or the user's
 * perception of it in any way.
 */
export class Component {
    
    public readonly incoming: Set<Relationship> = new Set();
    public readonly outgoing: Set<Relationship> = new Set();

    /**
     * properties hold any values that should be tracked
     * by the change analysis but do not have any other relevant behaviors
     */
    public readonly properties: ComponentProperty;

    public readonly type: string;
    public readonly subtype?: string;
    public readonly name: string;

    constructor(name: string, type: string, options? : ComponentOptions){
        this.properties = options?.properties ?? new ComponentProperty({});
        this.name = name;
        this.type = type;
        this.subtype = options?.subtype;
    }

    public addOutgoing(relationship: Relationship): void{
        if(relationship.source !== this)
            throw Error("Trying to add relationship that does not belong to component");
        this.outgoing.add(relationship);
        relationship.target.incoming.add(relationship);
    }

    public addIncoming(relationship: Relationship): void {
        if(relationship.target !== this)
            throw Error("Trying to add relationship that does not belong to component");

        relationship.source.addOutgoing(relationship);
    }

    public removeOutgoing(relationship: Relationship): void{
        if(relationship.source !== this)
            throw Error("Trying to remove relationship that does not belong to component");
        this.outgoing.delete(relationship);
        relationship.target.incoming.delete(relationship);
    }

    public removeIncoming(relationship: Relationship): void {
        if(relationship.target !== this)
            throw Error("Trying to remove relationship that does not belong to component");

        relationship.source.removeOutgoing(relationship);
    }
}
