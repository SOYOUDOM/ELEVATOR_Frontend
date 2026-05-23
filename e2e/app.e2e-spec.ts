import { ElevatorTemplatePage } from './app.po';

describe('Elevator App', function () {
    let page: ElevatorTemplatePage;

    beforeEach(() => {
        page = new ElevatorTemplatePage();
    });

    it('should display message saying app works', () => {
        page.navigateTo();
        expect(page.getParagraphText()).toEqual('app works!');
    });
});
