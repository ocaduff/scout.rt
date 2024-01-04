/*
 * Copyright (c) 2010, 2024 BSI Business Systems Integration AG
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package org.eclipse.scout.rt.shared.services.common.code;

import static org.junit.Assert.*;

import org.eclipse.scout.rt.api.data.FieldName;
import org.eclipse.scout.rt.api.data.ObjectType;
import org.eclipse.scout.rt.api.data.code.CodeDo;
import org.eclipse.scout.rt.api.data.code.CodeTypeDo;
import org.eclipse.scout.rt.dataobject.mapping.ToDoFunctionHelper;
import org.eclipse.scout.rt.platform.BEANS;
import org.eclipse.scout.rt.platform.Order;
import org.eclipse.scout.rt.platform.nls.NlsLocale;
import org.junit.Test;

public class CodeTypeToDoFunctionTest {
  @Test
  public void testConvert() {
    assertNull(convert(null));

    CodeTypeDo codeTypeDo = convert(new ConvertTestCodeType(12345L));
    assertEquals("12345", codeTypeDo.getId());
    assertEquals("iconId", codeTypeDo.getIconId());
    assertEquals("texts", codeTypeDo.getTextsPlural().get(NlsLocale.get().toLanguageTag()));
    assertEquals("text", codeTypeDo.getTexts().get(NlsLocale.get().toLanguageTag()));
    assertEquals(4, codeTypeDo.getMaxLevel().intValue());
    assertTrue(codeTypeDo.isHierarchical());
    assertEquals("text", codeTypeDo.getTexts().get(NlsLocale.get().toLanguageTag()));
    assertEquals("TestFixture", codeTypeDo.getObjectType());
    assertEquals(1, codeTypeDo.codes().size());
    assertCodeDo(codeTypeDo.codes().get(0));
  }

  protected CodeTypeDo convert(ICodeType<?, ?> codeType) {
    return BEANS.get(ToDoFunctionHelper.class).toDo(codeType, ICodeTypeToDoFunction.class);
  }

  protected void assertCodeDo(CodeDo codeDo) {
    assertEquals("10", codeDo.getId());
    assertTrue(codeDo.getActive());
    assertFalse(codeDo.isEnabled());
    assertEquals("codeIconId", codeDo.getIconId());
    assertEquals("tooltip", codeDo.getTooltipText());
    assertEquals("back", codeDo.getBackgroundColor());
    assertEquals("fore", codeDo.getForegroundColor());
    assertEquals("css", codeDo.getCssClass());
    assertEquals("ext", codeDo.getExtKey());
    assertEquals(111.1, codeDo.getValue());
    assertEquals("codeText", codeDo.getTexts().get(NlsLocale.get().toLanguageTag()));
    assertEquals("FONT-PLAIN-0", codeDo.getFont()); // is the parsed font
    assertEquals("testFieldName", codeDo.getFieldName());
    assertEquals("testObjectType", codeDo.getObjectType());
    assertEquals(0, codeDo.getSortCode().intValue());
    assertEquals(1, codeDo.children().size());
  }

  @ObjectType("TestFixture")
  private static final class ConvertTestCodeType extends AbstractCodeType<Long, Long> {
    private static final long serialVersionUID = 1L;

    private final Long m_id;

    private ConvertTestCodeType(Long id) {
      m_id = id;
    }

    @Override
    public Long getId() {
      return m_id;
    }

    @Override
    protected boolean getConfiguredIsHierarchy() {
      return true;
    }

    @Override
    protected int getConfiguredMaxLevel() {
      return 4;
    }

    @Override
    protected String getConfiguredIconId() {
      return "iconId";
    }

    @Override
    protected String getConfiguredText() {
      return "text";
    }

    @Override
    protected String getConfiguredTextPlural() {
      return "texts";
    }

    @Order(1000)
    @FieldName("testFieldName")
    @ObjectType("testObjectType")
    public static class ConvertTestCode extends AbstractCode<Long> {
      private static final long serialVersionUID = 1L;
      public static final long ID = 10L;

      @Override
      protected String getConfiguredText() {
        return "codeText";
      }

      @Override
      public Long getId() {
        return ID;
      }

      @Override
      protected boolean getConfiguredEnabled() {
        return false;
      }

      @Override
      protected String getConfiguredIconId() {
        return "codeIconId";
      }

      @Override
      protected String getConfiguredTooltipText() {
        return "tooltip";
      }

      @Override
      protected String getConfiguredBackgroundColor() {
        return "back";
      }

      @Override
      protected String getConfiguredForegroundColor() {
        return "fore";
      }

      @Override
      protected String getConfiguredCssClass() {
        return "css";
      }

      @Override
      protected String getConfiguredExtKey() {
        return "ext";
      }

      @Override
      protected Double getConfiguredValue() {
        return 111.1;
      }

      @Override
      protected String getConfiguredFont() {
        return "font";
      }

      @Order(1000)
      public static class ConvertTestChildCode extends AbstractCode<Long> {
        private static final long serialVersionUID = 1L;
        public static final long ID = 1000L;

        @Override
        public Long getId() {
          return ID;
        }
      }
    }

    @Order(2000)
    public static class ConvertTestCodeWithoutId extends AbstractCode<Long> {
      private static final long serialVersionUID = 1L;

      @Override
      public Long getId() {
        return null;
      }
    }
  }
}
