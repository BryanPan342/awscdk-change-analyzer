import React, { useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import CollapsableRow from '../reusable-components/CollapsableRow';
import { List, Paper, Typography } from '@material-ui/core';

import {
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  ListAltRounded
} from '@material-ui/icons';
import { ChangeAnalysisReport } from 'change-cd-iac-models/change-analysis-report';
import ChangesGroup from './ChangesGroup';
import { CompOpAggCharacteristics, Aggregation } from 'change-cd-iac-models/aggregations';
import { ComponentOperation } from 'change-cd-iac-models/model-diffing';
import { isDefined } from 'change-cd-iac-models/utils';

const useStyles = makeStyles({
  root: {
    height: '100%',
    maxHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  row: {
    alignItems: 'stretch',
    overflowY: 'hidden',
  },
  selected: {
    height: '100%',
  }
});

interface props {
    changeReport: ChangeAnalysisReport
}

function ChangeTree({changeReport}: props) {
    const classes = useStyles();
    const [expanded, setExpanded] = useState(0);

    return (
        <Paper elevation={3} className={classes.root}>
            <CollapsableRow
              icon={<ErrorIcon/>}
              className={`${expanded === 0 ? classes.selected : ''} ${classes.row}`}
              expanded={expanded === 0}
              onChange={(e, expand) => expand ? setExpanded(0) : setExpanded(-1)}
              title="High Risk Changes"
              content={
                <List disablePadding style={{width: '100%'}}>{
                  renderAggs(changeReport.aggregations)
                }</List>
              }
              color="#EA9B9A"
            />
            <CollapsableRow
              icon={<WarningIcon/>}
              className={`${expanded === 1 ? classes.selected : ''} ${classes.row}`}
              expanded={expanded === 1}
              onChange={(e, expand) => expand ? setExpanded(1) : setExpanded(-1)}
              title="Medium Risk Changes"
              content={"asd"}
              color="#F5E48E"
            />
            <CollapsableRow
              icon={<InfoIcon/>}
              className={`${expanded === 2 ? classes.selected : ''} ${classes.row}`}
              expanded={expanded === 2}
              onChange={(e, expand) => expand ? setExpanded(2) : setExpanded(-1)}
              title="Low Risk Changes"
              content={"asd"}
              color="#C1DEEC"
            />
        </Paper>
    );
}

function renderAggs(igs: Aggregation<ComponentOperation>[]){
  return igs.map(ig => <ChangesGroup
      ig={ig}
      title={`${ig.characteristics[CompOpAggCharacteristics.COMPONENT_TYPE]} ${ig.characteristics[CompOpAggCharacteristics.COMPONENT_SUBTYPE] || ''}`}
      description={
        ig.characteristics[CompOpAggCharacteristics.OPERATION_TYPE]
        ? ig.characteristics[CompOpAggCharacteristics.OPERATION_TYPE]
        : [...new Set(ig.subAggs?.map(sg => sg.characteristics[CompOpAggCharacteristics.OPERATION_TYPE]))]
          .filter(isDefined).join(', ')
      }
    />);
}


export default ChangeTree;