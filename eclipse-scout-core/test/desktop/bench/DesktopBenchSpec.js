/*
 * Copyright (c) 2010-2019 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 */
import {Form} from '../../../src/index';
import {FormSpecHelper, OutlineSpecHelper} from '@eclipse-scout/testing';

describe('DesktopBench', () => {
  let helper, session, desktop, formHelper;

  beforeEach(() => {
    setFixtures(sandbox());
    session = sandboxSession({
      desktop: {
        benchVisible: true
      }
    });
    desktop = session.desktop;
    helper = new OutlineSpecHelper(session);
    formHelper = new FormSpecHelper(session);
    jasmine.Ajax.install();
    jasmine.clock().install();
  });

  afterEach(() => {
    jasmine.Ajax.uninstall();
    jasmine.clock().uninstall();
  });

  describe('updateOutlineContent', () => {
    let outline, bench, model, node;

    beforeEach(() => {
      model = helper.createModelFixture(3, 2, true);
      outline = helper.createOutline(model);
      node = outline.nodes[0];
      node.detailForm = formHelper.createFormWithOneField();
      node.detailFormVisible = true;
      bench = desktop.bench;
      desktop.setOutline(outline);
    });

    it('called when an outline page gets selected', () => {
      spyOn(bench, 'updateOutlineContent');
      outline.selectNodes(outline.nodes[1]);
      expect(bench.updateOutlineContent.calls.count()).toEqual(1);
    });

    it('doesn\'t get called if page already is selected', () => {
      spyOn(bench, 'updateOutlineContent');
      outline.selectNodes(outline.nodes[1]);
      expect(bench.updateOutlineContent.calls.count()).toEqual(1);

      outline.selectNodes(outline.nodes[1]);
      expect(bench.updateOutlineContent.calls.count()).toEqual(1);

      outline.selectNodes([]);
      expect(bench.updateOutlineContent.calls.count()).toEqual(2);

      outline.selectNodes([]);
      expect(bench.updateOutlineContent.calls.count()).toEqual(2);
    });

    it('sets detailForm as outlineContent if node gets selected', () => {
      // node 0 has a detail form
      outline.selectNodes(outline.nodes[1]);
      expect(outline.selectedNodes[0].detailForm).toBeFalsy();
      expect(bench.outlineContent).toBeFalsy();

      outline.selectNodes(outline.nodes[0]);
      expect(outline.selectedNodes[0].detailForm).toBeTruthy();
      expect(bench.outlineContent).toBe(outline.selectedNodes[0].detailForm);

      outline.selectNodes(outline.nodes[1]);
      expect(outline.selectedNodes[0].detailForm).toBeFalsy();
      expect(bench.outlineContent).toBeFalsy();
    });

    it('preserves desktop.inBackground when updating outline content', () => {
      // select node 0 (which will be in foreground)
      outline.selectNodes(outline.nodes[0]);
      expect(desktop.inBackground).toBeFalsy();

      // open new form in foreground
      let form = formHelper.createFormWithOneField();
      form.displayHint = Form.DisplayHint.VIEW;
      form.displayViewId = 'C';
      desktop.showForm(form);

      expect(desktop.inBackground).toBeTruthy();

      // test that replace view is not called

      let form2 = formHelper.createFormWithOneField();
      outline.nodes[0].detailForm = form2;
      outline.nodes[0].detailFormVisible = true;

      bench.updateOutlineContent();

      // test that replace view is called once

      expect(form.rendered).toBeTruthy();
      expect(bench.outlineContent === outline.nodes[0].detailForm).toBeTruthy();
      expect(bench.outlineContent.rendered).toBeFalsy();
      expect(desktop.inBackground).toBeTruthy();
    });

    it('preserves desktop.inBackground when switching nodes', () => {
      // select node 0 (which will be in foreground)
      outline.selectNodes(outline.nodes[0]);
      expect(desktop.inBackground).toBeFalsy();

      // open new form in foreground
      let form = formHelper.createFormWithOneField();
      form.displayHint = Form.DisplayHint.VIEW;
      form.displayViewId = 'C';
      desktop.showForm(form);

      expect(desktop.inBackground).toBeTruthy();

      // test that replace view is not called

      // switch to node 1
      outline.nodes[1].detailForm = formHelper.createFormWithOneField();
      outline.nodes[1].detailFormVisible = true;

      outline.selectNodes(outline.nodes[1]);

      // test that replace view is called once

      expect(form.rendered).toBeTruthy();
      expect(bench.outlineContent === outline.nodes[1].detailForm).toBeTruthy();
      expect(bench.outlineContent.rendered).toBeFalsy();

      expect(desktop.inBackground).toBeTruthy();
    });
  });

});
