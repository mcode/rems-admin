import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import {
    Box,
    Button,
    IconButton,
    List,
    ListItem,
    ListItemIcon,
    ListItemText
  } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Close from '@mui/icons-material/Close';

const FormPopup = (props: { open: any; handleClose: any; data: any; }) => {
    const { open, handleClose, data } = props;

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            fullWidth={true}
            maxWidth='sm'
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
        >
            <DialogTitle sx={{ m: 0, p: 2 }} id="customized-dialog-title">
            REMS Status
            </DialogTitle>
            <IconButton
                aria-label="close"
                onClick={handleClose}
                sx={() => ({
                    position: 'absolute',
                    right: 8,
                    top: 8,
                    color: 'grey',
                })}
            >
                <CloseIcon />
            </IconButton>
            <DialogContent style={{paddingTop: '15px', borderBottom: '1px solid #F1F3F4'}}>
            <Box sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper' }}>
                <List>
                  {data?.metRequirements?.map((metRequirements: any) => {
                        return (
                            <ListItem
                            disablePadding
                            key={metRequirements.requirementName}
                            data-testid="etasu-item"
                            >
                            <ListItemIcon>
                                {metRequirements.completed ? (
                                <CheckCircle color="success" />
                                ) : (
                                <Close color="warning" />
                                )}
                            </ListItemIcon>
                            {metRequirements.completed ? (
                                <ListItemText primary={metRequirements.requirementName} />
                            ) : (
                                <ListItemText
                                primary={metRequirements.requirementName}
                                />
                            )}
                            </ListItem>
                        );
                  })}
                </List>
            </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} variant='outlined' sx={{borderColor: '#2F6A47', color: '#2F6A47'}}>Ok</Button>
            </DialogActions>
      </Dialog>
    )
};

export default FormPopup;