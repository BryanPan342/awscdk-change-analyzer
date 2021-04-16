import React from 'react';
import { ComponentOperation, OutgoingRelationshipComponentOperation, PropertyComponentOperation } from 'change-cd-iac-models/model-diffing';
import { Box, IconButton, makeStyles, Theme, Tooltip, Typography } from '@material-ui/core';
import { Launch as LaunchIcon } from '@material-ui/icons';
import { Aggregation, getAllDescriptions } from 'change-cd-iac-models/aggregations';
import CollapsableRow from '../../reusable-components/CollapsableRow';
import { useIdAssignerHook } from '../../utils/idCreator';
import ComponentPropertyDiff from '../../reusable-components/ComponentPropertyDiff';
import RelationshipOpDetails from '../../reusable-components/RelationshipOpDetails';
import { AppContext } from '../../App';

interface props {
    agg?: Aggregation<ComponentOperation>,
}

const useStyles = makeStyles((theme: Theme) => ({
    root: {
        margin: 0,
        display: 'flex',
        flexDirection: 'column'
    },
    emptyRoot: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    header: {
        padding: theme.spacing(1),
        backgroundColor: theme.palette.background.default,
    },
    ocurrencesTitle: {
        padding: theme.spacing(1, 0, 0, 1)
    },
    occurrences: {
        overflowX: 'hidden',
        overflowY: 'auto',
        height: '100%',
        padding: theme.spacing(0, 2),
    },
    occurrenceContent: {
        width: '100%',
        padding: theme.spacing(0, 2)
    },
    fillParent: {
        maxHeight: '100%',
        width: '100%',
        maxWidth: '100%',
        height: "100%",
        boxSizing: 'border-box',
    },
    mainCharacteristicDescription: {
        margin: theme.spacing(1)
    },
    characteristicDescription: {
        margin: theme.spacing(0.5, 1),
    }
}))

function ChangeDetailsPane({agg}: props) {
    const classes = useStyles();

    const descriptions = agg && getAllDescriptions(agg);

    const idAssigner = useIdAssignerHook();

    return <AppContext.Consumer>{({showComponentInHierarchy}) =>
        !agg
            ? <Box className={`${classes.fillParent} ${classes.emptyRoot}`}>Select a set of changes to view their details</Box> 
            : <Box className={`${classes.root} ${classes.fillParent}`}>
                <Box className={classes.header}>
                    {descriptions && descriptions[0]
                        ? <> 
                            <Typography variant="h5" className={classes.mainCharacteristicDescription}>
                                Changes to <b>{descriptions[0]}</b>
                            </Typography>
                            {descriptions && descriptions.slice(1).map(description => 
                                <Typography key={description} className={classes.characteristicDescription}>{description}</Typography>
                            )}
                        </>
                        : <Typography variant="h5" className={classes.mainCharacteristicDescription}>
                            Changes
                        </Typography>
                    }
                    
                    <Typography className={classes.ocurrencesTitle} variant="h6">Occurrences:</Typography>
                </Box>
                    <Box className={`${classes.fillParent} ${classes.occurrences}`}>
                    {[...agg.entities].map((op,i) =>
                        <CollapsableRow
                            stickySummary
                            key={idAssigner.get(op)}
                            expanded={agg.entities.size === 1}
                            icon={`${i+1}.`}
                            rightIcon={<Tooltip title="Open in Hierarchical View"><IconButton size="small" onClick={() => showComponentInHierarchy(op.componentTransition)}><LaunchIcon/></IconButton></Tooltip>}
                            title={<b>{(op.componentTransition.v2?.name || op.componentTransition.v1?.name)}</b>}
                            content={
                                <div className={`${classes.occurrenceContent}`}>
                                    {op instanceof OutgoingRelationshipComponentOperation && <RelationshipOpDetails relTransition={op.relationshipTransition}/>}
                                    <Typography><b>Source Definition:</b></Typography>
                                    <ComponentPropertyDiff
                                        componentTransition={op.componentTransition}
                                        propertyOp={op instanceof PropertyComponentOperation ? op : undefined}
                                    />
                                </div>
                            }
                        />
                    )}
                </Box>
            </Box>
        }</AppContext.Consumer>;
}
export default ChangeDetailsPane;