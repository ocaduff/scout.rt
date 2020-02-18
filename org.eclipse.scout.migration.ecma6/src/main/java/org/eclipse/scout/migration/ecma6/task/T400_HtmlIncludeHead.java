package org.eclipse.scout.migration.ecma6.task;

import java.nio.file.FileSystems;
import java.nio.file.PathMatcher;
import java.util.List;
import java.util.stream.Collectors;

import org.eclipse.scout.migration.ecma6.MigrationUtility;
import org.eclipse.scout.migration.ecma6.PathInfo;
import org.eclipse.scout.migration.ecma6.WorkingCopy;
import org.eclipse.scout.migration.ecma6.context.Context;
import org.eclipse.scout.rt.platform.Order;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Order(400)
public class T400_HtmlIncludeHead extends AbstractTask {
  private static final Logger LOG = LoggerFactory.getLogger(T400_HtmlIncludeHead.class);

  private static PathMatcher FILE_MATCHER = FileSystems.getDefault().getPathMatcher("glob:src/main/resources/WebContent/{index,login,logout,popup-window}.html");

  @Override
  public boolean accept(PathInfo pathInfo, Context context) {
    return FILE_MATCHER.matches(pathInfo.getModuleRelativePath());
  }

  @Override
  public void process(PathInfo pathInfo, Context context) {
    WorkingCopy workingCopy = context.ensureWorkingCopy(pathInfo.getPath());
    String source = workingCopy.getSource();

    Document doc = Jsoup.parse(source);
    Elements scoutStylesheetElements = doc.getElementsByTag("scout:include");
    final List<Element> includeTags = scoutStylesheetElements.stream()
        .filter(e -> e.attr("template") != null)
        .collect(Collectors.toList());
    Element headIncludeTag = null;
    for (Element e : includeTags) {
      String template = e.attr("template");
      if (template.equalsIgnoreCase("head.html")) {
        headIncludeTag = e;
      }
      source = source.replace(e.outerHtml(), e.outerHtml().replace(template, "includes/" + template));
    }
    if (headIncludeTag == null) {
      source = MigrationUtility.prependTodo(source, "Could not find '<scout:include template=\"head.html\" />' to replace with '<scout:include template=\"includes/head.html\" />'.", workingCopy.getLineDelimiter());
      LOG.warn("Could not find '<scout:include template=\"head.html\" />' to replace with '<scout:include template=\"includes/head.html\" />' in '" + workingCopy.getPath() + "'");
    }
    workingCopy.setSource(source);
  }
}
